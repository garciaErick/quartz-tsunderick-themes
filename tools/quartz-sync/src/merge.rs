//! Pure semantic 3-way merge for `quartz.config.yaml` (issue #5, Phase 1d).
//!
//! Inputs are three documents: `ancestor` (the merge base — the config as of
//! the fork's last sync), `ours` (the fork), `theirs` (the base's new state).
//! All operate on [`serde_yaml_ng::Value`]; this module never does I/O, which
//! keeps it exhaustively unit-testable.
//!
//! ## Semantics
//!
//! - **`configuration`**: deep per-key 3-way. The fork's intentional change
//!   (≠ ancestor) wins; base's change flows where the fork didn't touch;
//!   both-changed → fork wins + warning. Identity keys (pageTitle, baseUrl,
//!   locale, typography, colors…) are fork-owned by construction because the
//!   fork is the only side that changes them after conversion.
//! - **`plugins`**: union by normalized `source` (`./plugins/x` ≡
//!   `plugins/x`). Per-field (`enabled` / `order` / `options` / `layout` /
//!   anything else) true 3-way with the same rule. Fork additions and
//!   deletions win; base's *new* entries are inherited (appended after the
//!   fork's entries). The `source` field itself is identity, not content:
//!   the fork's spelling always wins. Structural surprises (duplicate
//!   sources within one document) are hard errors — the caller exits nonzero
//!   and git falls back to normal conflict markers for manual resolution.
//! - **`layout`**: deep per-path 3-way via the same recursive mapping merge
//!   (nested maps merge per key; sequences and scalars resolve whole).
//! - **Any other top-level key**: the same recursive rule (future-proofing).
//!
//! Mappings recurse; **sequences never recurse** — a list (e.g. the
//! theme-switcher `themes` menu) is one atomic value, so "both touched" is
//! well-defined: fork wins, with a warning naming the path.

use serde_yaml_ng::{Mapping, Value};

#[derive(Debug)]
pub enum MergeError {
    /// The same normalized plugin source appears twice within one document.
    DuplicateSource { file: &'static str, source: String },
    /// A plugins entry is not a mapping or lacks a `source` key.
    MalformedEntry { file: &'static str, index: usize },
}

impl std::fmt::Display for MergeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MergeError::DuplicateSource { file, source } => write!(
                f,
                "duplicate plugin source `{source}` in the {file} document — structural surprise, refusing to guess"
            ),
            MergeError::MalformedEntry { file, index } => write!(
                f,
                "plugins[{index}] in the {file} document is not a mapping with a `source` key"
            ),
        }
    }
}

#[derive(Debug)]
pub struct MergeOutput {
    pub merged: Value,
    pub warnings: Vec<String>,
}

/// Merge three root documents (each guaranteed a mapping by `yaml_io::parse`).
pub fn merge_configs(
    ancestor: &Value,
    ours: &Value,
    theirs: &Value,
) -> Result<MergeOutput, MergeError> {
    let mut warnings = Vec::new();
    let merged = merge_root(
        ancestor.as_mapping().expect("mapping root"),
        ours.as_mapping().expect("mapping root"),
        theirs.as_mapping().expect("mapping root"),
        &mut warnings,
    )?;
    Ok(MergeOutput {
        merged: Value::Mapping(merged),
        warnings,
    })
}

/// Ordered key union: ancestor's order first, then ours' new keys, then
/// theirs'. Stable ordering keeps emitted diffs clean across syncs.
fn union_keys(anc: &Mapping, our: &Mapping, thir: &Mapping) -> Vec<Value> {
    let mut keys: Vec<Value> = Vec::new();
    for m in [anc, our, thir] {
        for k in m.keys() {
            if !keys.contains(k) {
                keys.push(k.clone());
            }
        }
    }
    keys
}

/// Root merge: `plugins` gets the union-by-source treatment; everything else
/// (`configuration`, `layout`, future sections) gets recursive per-key 3-way.
fn merge_root(
    anc: &Mapping,
    our: &Mapping,
    thir: &Mapping,
    warnings: &mut Vec<String>,
) -> Result<Mapping, MergeError> {
    let mut out = Mapping::new();
    for key in union_keys(anc, our, thir) {
        match key.as_str() {
            Some("plugins") => {
                let merged = merge_plugins(anc.get(&key), our.get(&key), thir.get(&key), warnings)?;
                out.insert(key, Value::Sequence(merged));
            }
            _ => {
                if let Some(v) = merge_value(
                    &path_of(&key),
                    anc.get(&key),
                    our.get(&key),
                    thir.get(&key),
                    warnings,
                ) {
                    out.insert(key, v);
                }
            }
        }
    }
    Ok(out)
}

fn path_of(key: &Value) -> String {
    match key.as_str() {
        Some(s) => format!("$.{s}"),
        None => format!("$.{key:?}"),
    }
}

/// Recursive 3-way for one path. `None` = key absent on that side; a `None`
/// result = key absent from the output. Presence and value participate in the
/// change detection, so additions and deletions follow the same rules as
/// edits: the fork's intentional change wins, base's change flows where the
/// fork didn't touch, both-changed → fork wins + warning.
///
/// **Absence semantics (deliberate):** fork configs are full-ownership
/// documents (materialized at conversion), so a key missing from `ours` is an
/// intentional deletion, not "no opinion" — this retires the engine-era
/// partial-overlay habit where absent keys inherited defaults. To keep a key,
/// leave it in the file; to drop it, remove it.
fn merge_value(
    path: &str,
    anc: Option<&Value>,
    our: Option<&Value>,
    thir: Option<&Value>,
    warnings: &mut Vec<String>,
) -> Option<Value> {
    if our == thir {
        // Both sides agree (unchanged, changed identically, or both absent).
        return our.cloned();
    }
    // Three mappings → recurse per key (deep per-path 3-way).
    if let (Some(Value::Mapping(a)), Some(Value::Mapping(o)), Some(Value::Mapping(t))) =
        (anc, our, thir)
    {
        let mut out = Mapping::new();
        for key in union_keys(a, o, t) {
            if let Some(v) = merge_value(
                &format!("{path}.{}", key_as_str(&key)),
                a.get(&key),
                o.get(&key),
                t.get(&key),
                warnings,
            ) {
                out.insert(key, v);
            }
        }
        return Some(Value::Mapping(out));
    }
    let ours_changed = our != anc;
    let theirs_changed = thir != anc;
    match (ours_changed, theirs_changed) {
        (false, false) => our.cloned(),
        (false, true) => thir.cloned(),
        (true, false) => our.cloned(),
        (true, true) => {
            warnings.push(format!(
                "{path}: both sides changed since the merge base; kept the fork's version (fork wins)"
            ));
            our.cloned()
        }
    }
}

fn key_as_str(key: &Value) -> String {
    key.as_str()
        .map(str::to_string)
        .unwrap_or_else(|| format!("{key:?}"))
}

/// Normalize a plugin source for identity comparison: `./plugins/x` ≡
/// `plugins/x`. Non-string sources are canonicalized by YAML serialization.
fn normalized_source(source: &Value) -> String {
    if let Some(s) = source.as_str() {
        s.strip_prefix("./").unwrap_or(s).to_string()
    } else {
        serde_yaml_ng::to_string(source)
            .unwrap_or_default()
            .trim()
            .to_string()
    }
}

/// Convert a `plugins` section into an ordered source→entry mapping,
/// rejecting malformed entries and duplicate normalized sources.
fn plugins_by_source(
    section: Option<&Value>,
    file: &'static str,
) -> Result<Option<Mapping>, MergeError> {
    match section {
        None | Some(Value::Null) => Ok(None),
        Some(Value::Sequence(seq)) => {
            let mut map = Mapping::new();
            for (i, entry) in seq.iter().enumerate() {
                let Some(m) = entry.as_mapping() else {
                    return Err(MergeError::MalformedEntry { file, index: i });
                };
                let Some(source) = m.get(Value::String("source".into())) else {
                    return Err(MergeError::MalformedEntry { file, index: i });
                };
                let key = normalized_source(source);
                if map
                    .insert(Value::String(key.clone()), entry.clone())
                    .is_some()
                {
                    return Err(MergeError::DuplicateSource { file, source: key });
                }
            }
            Ok(Some(map))
        }
        Some(_) => Err(MergeError::MalformedEntry { file, index: 0 }),
    }
}

fn merge_plugins(
    anc: Option<&Value>,
    our: Option<&Value>,
    thir: Option<&Value>,
    warnings: &mut Vec<String>,
) -> Result<Vec<Value>, MergeError> {
    let empty = Mapping::new();
    let anc = plugins_by_source(anc, "ancestor")?.unwrap_or_else(|| empty.clone());
    let our = plugins_by_source(our, "fork")?.unwrap_or_else(|| empty.clone());
    let thir = plugins_by_source(thir, "base")?.unwrap_or_else(|| empty.clone());

    // Result order: the fork's entries (fork order), then base's additions.
    // Ordering is irrelevant downstream — execution sorts by `order`, layout
    // by `priority` — but stable output keeps emitted diffs clean.
    let mut ordered_keys: Vec<Value> = our.keys().cloned().collect();
    for k in thir.keys() {
        if !our.contains_key(k) && !anc.contains_key(k) {
            // base-only AND never seen by the fork → inherit.
            // (in ancestor but not in ours → the fork deleted it; deletions win)
            ordered_keys.push(k.clone());
        }
    }

    let mut out = Vec::with_capacity(ordered_keys.len());
    for key in ordered_keys {
        let a = anc.get(&key);
        let o = our.get(&key);
        let t = thir.get(&key);
        if let Some(Value::Mapping(mut entry)) =
            merge_value(&format!("plugins[{}]", key_as_str(&key)), a, o, t, warnings)
        {
            // `source` is identity, not content: the fork's spelling wins
            // verbatim (normalization is only for matching).
            if let Some(our_source) = o.and_then(|e| {
                e.as_mapping()
                    .and_then(|m| m.get(Value::String("source".into())).cloned())
            }) {
                entry.insert(Value::String("source".into()), our_source);
            }
            out.push(Value::Mapping(entry));
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_yaml_ng::Value;

    fn yaml(s: &str) -> Value {
        serde_yaml_ng::from_str(s).expect("test fixture YAML")
    }

    fn plugins_of(v: &Value) -> Vec<String> {
        v.as_mapping()
            .unwrap()
            .get(Value::String("plugins".into()))
            .and_then(Value::as_sequence)
            .unwrap()
            .iter()
            .map(|e| {
                normalized_source(
                    e.as_mapping()
                        .unwrap()
                        .get(Value::String("source".into()))
                        .unwrap(),
                )
            })
            .collect()
    }

    fn plugin<'a>(v: &'a Value, suffix: &str) -> &'a Mapping {
        v.as_mapping()
            .unwrap()
            .get(Value::String("plugins".into()))
            .unwrap()
            .as_sequence()
            .unwrap()
            .iter()
            .filter_map(Value::as_mapping)
            .find(|m| {
                m.get(Value::String("source".into()))
                    .and_then(Value::as_str)
                    .map(|s| s.strip_prefix("./").unwrap_or(s))
                    .map(|s| s.ends_with(suffix))
                    .unwrap_or(false)
            })
            .expect("plugin in fixture")
    }

    // ── fixture 1: base adds a plugin ────────────────────────────────────
    #[test]
    fn base_adds_plugin() {
        let anc = yaml("plugins: [{source: a, enabled: true}]");
        let our = yaml("plugins: [{source: a, enabled: true}]");
        let thir = yaml("plugins: [{source: a, enabled: true}, {source: b, enabled: true}]");
        let out = merge_configs(&anc, &our, &thir).unwrap();
        assert_eq!(plugins_of(&out.merged), vec!["a", "b"]);
        assert!(out.warnings.is_empty());
    }

    // ── fixture 2: base fixes house-plugin options while the fork changes ─
    //    its own identity (both flow to their respective places) ──────────
    #[test]
    fn base_fixes_options_and_fork_changes_identity() {
        let anc = yaml(
            "plugins:\n  \
             - source: ./plugins/reader-zen\n    \
             enabled: true\n    \
             options: {zenMode: false, fullWidth: true}\n  \
             - source: ./plugins/theme-switcher\n    \
             enabled: true\n    \
             options:\n      \
             bakedTheme: lattelogic\n      \
             themes: [default, typora-milky, typora-smoky]",
        );
        // the fork trims the theme menu (fork identity choice)
        let our = yaml(
            "plugins:\n  \
             - source: ./plugins/reader-zen\n    \
             enabled: true\n    \
             options: {zenMode: false, fullWidth: true}\n  \
             - source: ./plugins/theme-switcher\n    \
             enabled: true\n    \
             options:\n      \
             bakedTheme: lattelogic\n      \
             themes: [default, typora-smoky]",
        );
        // the base fixes reader-zen options (house-plugin upstream fix) and
        // spells local sources without "./"
        let thir = yaml(
            "plugins:\n  \
             - source: plugins/reader-zen\n    \
             enabled: true\n    \
             options: {zenMode: true, fullWidth: true}\n  \
             - source: plugins/theme-switcher\n    \
             enabled: true\n    \
             options:\n      \
             bakedTheme: lattelogic\n      \
             themes: [default, typora-milky, typora-smoky]",
        );
        let out = merge_configs(&anc, &our, &thir).unwrap();
        assert!(out.warnings.is_empty(), "{:?}", out.warnings);
        let zen = plugin(&out.merged, "reader-zen");
        assert_eq!(
            zen.get(Value::String("options".into()))
                .and_then(Value::as_mapping)
                .and_then(|m| m.get(Value::String("zenMode".into()))),
            Some(&Value::Bool(true)),
            "base's house-plugin fix must flow into the fork"
        );
        assert_eq!(
            zen.get(Value::String("source".into())),
            Some(&Value::String("./plugins/reader-zen".into())),
            "the fork's source spelling wins"
        );
        let ts = plugin(&out.merged, "theme-switcher");
        let themes = ts
            .get(Value::String("options".into()))
            .and_then(Value::as_mapping)
            .and_then(|m| m.get(Value::String("themes".into())))
            .and_then(Value::as_sequence)
            .unwrap();
        assert_eq!(
            themes.len(),
            2,
            "the fork's trimmed theme menu must survive"
        );
    }

    // ── fixture 3: the fork disables an inherited plugin while base edits ─
    //    another field of the same entry (per-field 3-way, no collision) ──
    #[test]
    fn fork_disables_inherited_plugin() {
        let anc = yaml(
            "plugins:\n  \
             - source: '@quartz-community/explorer'\n    \
             enabled: true\n    \
             layout: {position: left, priority: 50}",
        );
        let our = yaml(
            "plugins:\n  \
             - source: '@quartz-community/explorer'\n    \
             enabled: false",
        );
        let thir = yaml(
            "plugins:\n  \
             - source: '@quartz-community/explorer'\n    \
             enabled: true\n    \
             order: 15\n    \
             layout: {position: left, priority: 50}",
        );
        let out = merge_configs(&anc, &our, &thir).unwrap();
        assert!(out.warnings.is_empty(), "{:?}", out.warnings);
        let explorer = plugin(&out.merged, "explorer");
        assert_eq!(
            explorer.get(Value::String("enabled".into())),
            Some(&Value::Bool(false))
        );
        assert_eq!(
            explorer.get(Value::String("order".into())),
            Some(&Value::Number(15.into())),
            "base's order change flows where the fork didn't touch"
        );
    }

    // ── fixture 4: both touch theme-switcher's themes list ───────────────
    #[test]
    fn both_touch_theme_switcher_fork_wins_with_warning() {
        let anc = yaml(
            "plugins:\n  \
             - source: ./plugins/theme-switcher\n    \
             options:\n      \
             themes: [default, typora-milky, typora-smoky]",
        );
        let our = yaml(
            "plugins:\n  \
             - source: ./plugins/theme-switcher\n    \
             options:\n      \
             themes: [default, monokai]",
        );
        let thir = yaml(
            "plugins:\n  \
             - source: ./plugins/theme-switcher\n    \
             options:\n      \
             themes: [default, typora-milky, typora-smoky, palenight]",
        );
        let out = merge_configs(&anc, &our, &thir).unwrap();
        assert_eq!(out.warnings.len(), 1, "{:?}", out.warnings);
        assert!(out.warnings[0].contains("themes"), "{}", out.warnings[0]);
        let ts = plugin(&out.merged, "theme-switcher");
        let got: Vec<&str> = ts
            .get(Value::String("options".into()))
            .and_then(Value::as_mapping)
            .and_then(|m| m.get(Value::String("themes".into())))
            .and_then(Value::as_sequence)
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .collect();
        assert_eq!(got, vec!["default", "monokai"], "fork wins on both-changed");
    }

    // ── configuration: per-key, fork identity wins, base additions flow ──
    #[test]
    fn configuration_deep_per_key() {
        let anc = yaml("configuration: {pageTitle: Fork, baseUrl: fork.dev, locale: en-US}");
        let our = yaml("configuration: {pageTitle: My Garden, baseUrl: fork.dev, locale: en-US}");
        let thir = yaml(
            "configuration: {pageTitle: Fork, baseUrl: fork.dev, locale: en-US, enablePopovers: true}",
        );
        let out = merge_configs(&anc, &our, &thir).unwrap();
        assert!(out.warnings.is_empty(), "{:?}", out.warnings);
        let cfg = out
            .merged
            .as_mapping()
            .unwrap()
            .get(Value::String("configuration".into()))
            .and_then(Value::as_mapping)
            .unwrap();
        assert_eq!(
            cfg.get(Value::String("pageTitle".into())),
            Some(&Value::String("My Garden".into()))
        );
        assert_eq!(
            cfg.get(Value::String("enablePopovers".into())),
            Some(&Value::Bool(true))
        );
    }

    #[test]
    fn configuration_both_change_fork_wins_with_warning() {
        let anc = yaml("configuration: {pageTitle: Old}");
        let our = yaml("configuration: {pageTitle: ForkTitle}");
        let thir = yaml("configuration: {pageTitle: BaseTitle}");
        let out = merge_configs(&anc, &our, &thir).unwrap();
        assert_eq!(out.warnings.len(), 1);
        let cfg = out
            .merged
            .as_mapping()
            .unwrap()
            .get(Value::String("configuration".into()))
            .and_then(Value::as_mapping)
            .unwrap();
        assert_eq!(
            cfg.get(Value::String("pageTitle".into())),
            Some(&Value::String("ForkTitle".into()))
        );
    }

    // ── layout: deep per-path 3-way ──────────────────────────────────────
    // Full-ownership model: the fork's file carries every key it wants to
    // keep; removing a key is a deletion. Here the fork rewrites `positions`
    // while KEEPING `exclude`, and the base edits `exclude` — different
    // sub-paths, so both flow cleanly.
    #[test]
    fn layout_deep_per_path() {
        let anc = yaml(
            "layout:\n  byPageType:\n    folder:\n      exclude: [reader-zen]\n      positions: {right: [toc]}",
        );
        // the fork clears the right sidebar for folder pages (keeps exclude —
        // full-ownership: absent would mean "delete")
        let our = yaml(
            "layout:\n  byPageType:\n    folder:\n      exclude: [reader-zen]\n      positions: {right: []}",
        );
        // the base adds an exclusion
        let thir = yaml(
            "layout:\n  byPageType:\n    folder:\n      exclude: [reader-zen, comments]\n      positions: {right: [toc]}",
        );
        let out = merge_configs(&anc, &our, &thir).unwrap();
        assert!(out.warnings.is_empty(), "{:?}", out.warnings);
        let folder = out
            .merged
            .as_mapping()
            .unwrap()
            .get(Value::String("layout".into()))
            .and_then(Value::as_mapping)
            .and_then(|m| m.get(Value::String("byPageType".into())))
            .and_then(Value::as_mapping)
            .and_then(|m| m.get(Value::String("folder".into())))
            .and_then(Value::as_mapping)
            .unwrap();
        assert_eq!(
            folder
                .get(Value::String("exclude".into()))
                .and_then(Value::as_sequence)
                .unwrap()
                .len(),
            2,
            "base's new exclusion flows"
        );
        assert_eq!(
            folder
                .get(Value::String("positions".into()))
                .and_then(Value::as_mapping)
                .and_then(|m| m.get(Value::String("right".into())))
                .and_then(Value::as_sequence)
                .unwrap()
                .len(),
            0,
            "the fork's cleared right sidebar survives"
        );
    }

    // ── structural surprises are hard errors ─────────────────────────────
    #[test]
    fn duplicate_sources_error() {
        let doc = yaml(
            "plugins: [{source: ./plugins/a, enabled: true}, {source: plugins/a, enabled: false}]",
        );
        let err = merge_configs(&yaml("plugins: []"), &doc, &yaml("plugins: []")).unwrap_err();
        assert!(
            matches!(err, MergeError::DuplicateSource { ref source, .. } if source == "plugins/a"),
            "{err}"
        );
    }

    #[test]
    fn malformed_entry_errors() {
        let doc = yaml("plugins: [{enabled: true}]");
        assert!(matches!(
            merge_configs(&yaml("plugins: []"), &doc, &yaml("plugins: []")),
            Err(MergeError::MalformedEntry { .. })
        ));
    }

    // ── deletions: the fork's intent always wins ─────────────────────────
    #[test]
    fn fork_deletion_of_plugin_wins() {
        let anc = yaml("plugins: [{source: a, enabled: true}, {source: b, enabled: true}]");
        let our = yaml("plugins: [{source: a, enabled: true}]");
        // base edited b while the fork deleted it → deletion wins
        let thir =
            yaml("plugins: [{source: a, enabled: true}, {source: b, enabled: true, order: 5}]");
        let out = merge_configs(&anc, &our, &thir).unwrap();
        assert_eq!(plugins_of(&out.merged), vec!["a"]);
    }

    #[test]
    fn fork_deletion_of_config_key_wins() {
        let anc = yaml("configuration: {pageTitle: X, analytics: plausible}");
        let our = yaml("configuration: {pageTitle: X}");
        let thir = yaml("configuration: {pageTitle: X, analytics: plausible}");
        let out = merge_configs(&anc, &our, &thir).unwrap();
        let cfg = out
            .merged
            .as_mapping()
            .unwrap()
            .get(Value::String("configuration".into()))
            .and_then(Value::as_mapping)
            .unwrap();
        assert!(!cfg.contains_key(Value::String("analytics".into())));
    }

    // ── absence = deletion: removing a key the base still carries is the ──
    //    fork's intentional act (full-ownership model) ────────────────────
    #[test]
    fn fork_deletion_inside_layout_wins_with_warning_when_base_changed_it() {
        let anc = yaml("layout:\n  groups:\n    toolbar: {priority: 35, direction: row}");
        // the fork deletes `groups` entirely (hand-trimmed layout section)
        let our = yaml("layout: {}");
        // the base tweaked the toolbar priority while the fork deleted it
        let thir = yaml("layout:\n  groups:\n    toolbar: {priority: 20, direction: row}");
        let out = merge_configs(&anc, &our, &thir).unwrap();
        assert_eq!(out.warnings.len(), 1, "{:?}", out.warnings);
        assert!(out.warnings[0].contains("groups"), "{}", out.warnings[0]);
        let layout = out
            .merged
            .as_mapping()
            .unwrap()
            .get(Value::String("layout".into()))
            .and_then(Value::as_mapping)
            .unwrap();
        assert!(
            !layout.contains_key(Value::String("groups".into())),
            "fork deletion wins even when base changed the same key"
        );
    }

    #[test]
    fn output_plugin_order_is_ours_then_base_additions() {
        let anc = yaml("plugins: [{source: a, enabled: true}]");
        let our = yaml("plugins: [{source: a, enabled: true}, {source: z, enabled: true}]");
        let thir = yaml("plugins: [{source: a, enabled: true}, {source: b, enabled: true}]");
        let out = merge_configs(&anc, &our, &thir).unwrap();
        assert_eq!(plugins_of(&out.merged), vec!["a", "z", "b"]);
    }
}
