---
name: data-modeling
description: Design durable database schemas with clear keys, relationships, constraints, and normalization suited to the access patterns.
---

# Data modeling

## Establish requirements
- Confirm the domain, access patterns, growth expectations, and consistency needs.
- Read repository instructions, the relevant spec, and existing schema and conventions.
- Update the corresponding spec before adding behavior; keep model and schema in sync.
- Reuse existing naming, key types, and migration tooling rather than inventing a format.

## Design the model
- Choose a primary key strategy consistent with existing tables.
- Model relationships explicitly with foreign keys and appropriate cardinality.
- Normalize to remove duplication unless a measured read pattern justifies denormalization.
- Define column types, nullability, defaults, and constraints from real domain rules.
- Add uniqueness, check, and referential constraints the data must satisfy.
- Plan indexes for the stated filter, join, and sort patterns.
- Include created/updated timestamps and soft-delete or lifecycle fields where the project expects them.
- Avoid storing derived data that can drift, and document any intentional redundancy.

## Verify and deliver
- Express the design as a migration or schema file using existing tooling.
- Check the model against representative queries and confirm they remain efficient.
- Provide an entity or relationship diagram and the rationale for key decisions.
- Report tradeoffs, assumptions, and cases not covered by the design.
- Ask permission before applying schema changes to shared or production data.
