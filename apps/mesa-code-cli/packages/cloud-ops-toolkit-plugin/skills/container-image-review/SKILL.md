---
name: container-image-review
description: Review Dockerfiles and container images for correctness, image size, security posture, and reproducible builds using existing build and scan tools.
---

# Container image review

## Establish scope
- Confirm the image, registry, target platform or architecture, and the build command actually used.
- Read the Dockerfile, build scripts, ignore files, and CI configuration before proposing changes.
- Identify which build, inspect, or scan tools are already available; do not invent a scanner or registry API.
- Preserve existing base-image policy, pinned versions, and unrelated edits.

## Review the definition
- Prefer a minimal, trusted base image and a pinned or digest-qualified tag for reproducibility.
- Use a multi-stage build to keep compilers and dev dependencies out of the final image.
- Order layers so dependency installation is cached before frequently changing source is copied.
- Copy only required files; honor and maintain `.dockerignore` to avoid leaking secrets or large context.
- Run as a non-root user and avoid unnecessary privileges or capabilities.
- Keep secrets out of image layers, build args, and history; expect them injected at runtime instead.
- Set explicit signals, entrypoint, working directory, and required runtime environment.
- Declare exposure and ports consistent with the actual service, and add a real health check.
- Verify reproducible behavior: same inputs and lockfile produce the same dependency set.

## Verify and report
- Build the image when the environment allows and record actual size, tags, and architecture.
- Scan for known vulnerabilities when a scanner exists; otherwise say the scan was not performed.
- Inspect the final image contents and user rather than trusting the Dockerfile alone.
- Report findings with file, line, evidence, and the smallest concrete fix.
- List what was verified by running versus by reading, and any unpinned dependencies or risks left.
