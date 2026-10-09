# Mesa Code database toolkit

Instruction-only skills: `schema-migration` changes schemas safely and reversibly; `query-optimization` tunes slow queries with measured evidence; `data-modeling` designs normalized, durable tables; `seed-fixtures` builds deterministic seed and fixture data.

Uses the database engine, migration tool, and dependencies already present in the target project. Adds no runtime, database driver, ORM, or dependency installation. Missing tools and unrun checks must be reported. Changes require specification alignment and preservation of unrelated edits; destructive actions, production data, and external writes require explicit permission.

This directory provides skill assets only. Catalog registration, bundling, installer delivery, and runtime discovery are separate work and are not established by these files. Version 1.0.0; author Mesa Code; license MIT.
