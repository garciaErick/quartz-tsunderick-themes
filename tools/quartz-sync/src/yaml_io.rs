//! YAML I/O boundary — the ONLY module that touches the YAML crate.
//!
//! Rationale (Phase 0 finding, decision taken at Phase 1-T): `serde_yaml_ng`
//! is a maintained continuation of `serde_yaml`; its `Mapping` preserves
//! insertion order (required: key-order preservation for the 3-way merge) and
//! its emitter is deterministic (same value → same bytes; required: clean git
//! diffs across syncs). If the ecosystem shifts again, swap the
//! implementation inside this file and leave `merge.rs` untouched.
//!
//! Comment handling: YAML emitters are comment-lossy. The one comment that
//! matters in practice is the leading directive block of `quartz.config.yaml`
//! (`# yaml-language-server: $schema=...` plus any header prose). We capture
//! the leading comment block verbatim before parsing and re-emit it after
//! emitting — full-fidelity round-tripping is unnecessary for the merge use
//! case.

use serde_yaml_ng::{Mapping, Value};

/// A parsed config plus its leading comment block (verbatim lines).
pub struct ParsedConfig {
    pub value: Value,
    pub leading_comments: String,
}

#[derive(Debug)]
pub struct ParseError {
    pub context: String,
    pub source: String,
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "failed to parse {} as YAML: {}",
            self.context, self.source
        )
    }
}

/// Split the contiguous leading comment block (lines whose first
/// non-whitespace character is `#`) from the rest of the document.
fn split_leading_comments(raw: &str) -> (String, String) {
    let mut comment_bytes = 0usize;
    for line in raw.split_inclusive('\n') {
        if line.trim_start().starts_with('#') {
            comment_bytes += line.len();
        } else {
            break;
        }
    }
    let (head, tail) = raw.split_at(comment_bytes);
    (head.to_string(), tail.to_string())
}

/// Parse a config document, capturing its leading comment block. Empty or
/// comment-only documents parse as an empty mapping; non-mapping roots are
/// errors.
pub fn parse(raw: &str, context: &str) -> Result<ParsedConfig, ParseError> {
    let (comments, body) = split_leading_comments(raw);
    let value: Value = serde_yaml_ng::from_str(&body).map_err(|e| ParseError {
        context: context.to_string(),
        source: e.to_string(),
    })?;
    let value = match value {
        Value::Null => Value::Mapping(Mapping::new()),
        Value::Mapping(_) => value,
        other => {
            return Err(ParseError {
                context: context.to_string(),
                source: format!(
                    "expected a mapping at document root, found {}",
                    type_name(&other)
                ),
            });
        }
    };
    Ok(ParsedConfig {
        value,
        leading_comments: comments,
    })
}

/// Emit a config value, re-attaching a captured leading comment block.
pub fn emit(value: &Value, leading_comments: &str) -> String {
    let body = serde_yaml_ng::to_string(value).unwrap_or_default();
    let mut out = String::new();
    if !leading_comments.is_empty() {
        out.push_str(leading_comments);
        if !out.ends_with('\n') {
            out.push('\n');
        }
    }
    out.push_str(&body);
    out
}

pub fn type_name(v: &Value) -> &'static str {
    match v {
        Value::Null => "null",
        Value::Bool(_) => "bool",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Sequence(_) => "sequence",
        Value::Mapping(_) => "mapping",
        Value::Tagged(_) => "tagged",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_leading_comment_block() {
        let raw = "# yaml-language-server: $schema=./schema.json\n# prose header\nconfiguration:\n  pageTitle: X\n";
        let parsed = parse(raw, "test").unwrap();
        assert_eq!(
            parsed.leading_comments,
            "# yaml-language-server: $schema=./schema.json\n# prose header\n"
        );
        let out = emit(&parsed.value, &parsed.leading_comments);
        assert!(out.starts_with("# yaml-language-server: $schema=./schema.json\n"));
        assert!(out.contains("pageTitle: X"));
    }

    #[test]
    fn no_comments_is_unchanged() {
        let raw = "configuration:\n  pageTitle: X\n";
        let parsed = parse(raw, "test").unwrap();
        assert!(parsed.leading_comments.is_empty());
        let out = emit(&parsed.value, &parsed.leading_comments);
        assert!(out.contains("pageTitle: X"));
    }

    #[test]
    fn mapping_key_order_is_preserved() {
        let raw = "z: 1\na: 2\nm: 3\n";
        let parsed = parse(raw, "test").unwrap();
        let keys: Vec<String> = parsed
            .value
            .as_mapping()
            .unwrap()
            .keys()
            .map(|k| k.as_str().unwrap().to_string())
            .collect();
        assert_eq!(keys, vec!["z", "a", "m"]);
    }

    #[test]
    fn empty_and_comment_only_documents_parse_as_empty_mapping() {
        assert!(
            parse("", "test")
                .unwrap()
                .value
                .as_mapping()
                .unwrap()
                .is_empty()
        );
        assert!(
            parse("# only a comment\n", "test")
                .unwrap()
                .value
                .as_mapping()
                .unwrap()
                .is_empty()
        );
    }

    #[test]
    fn scalar_root_is_an_error() {
        assert!(parse("just a string\n", "test").is_err());
    }

    #[test]
    fn inline_comment_after_value_is_body_not_header() {
        let raw = "# header\nkey: value # inline\n";
        let parsed = parse(raw, "test").unwrap();
        assert_eq!(parsed.leading_comments, "# header\n");
    }

    #[test]
    fn emit_is_deterministic() {
        let parsed = parse("a: 1\nb: [x, y]\n", "test").unwrap();
        let one = emit(&parsed.value, "");
        let two = emit(&parsed.value, "");
        assert_eq!(one, two);
    }
}
