# lazily-react — build, format, test, and reachability gates.
#
# Every gate is its own target rather than two lines in one monolithic recipe. A
# monolithic `check` is opaque to the CI-reachability guard below: it can only
# report the whole target as reached or missing, so a reader cannot see WHICH
# gate CI stopped running.
.PHONY: check fmt fmt-fix build test ci-reach

check: fmt build test ci-reach

# The formatting GATE (#lazilyformattinggate). prettier pinned to an EXACT
# version in devDependencies — no caret, because prettier ships style changes in
# minors and a range would make the verdict move on npm's release schedule rather
# than on anything a contributor did. Same version as lazily-js: these two are one
# JavaScript family, and a split pin would let them drift apart.
#
# --check is the gate; `fmt-fix` writes and is not in `check`.
fmt:
	npm run format

fmt-fix:
	npm run format:fix

# `npm run build` is this repo's lint equivalent: it syntax-checks every published
# entry point with `node --check`. There is no bundler step.
build:
	npm run build

test:
	npm test

# CI-reachability guard (#lzcheckcireachguard). Fails when a target above runs a
# gate no CI workflow step reaches. This binding is why the guard matters: it had
# NO workflow at all, so every gate here ran only on a laptop and nothing verified
# a push (#lazilyreactworkflow). It guards itself — `ci-reach` is in `check`, so
# CI has to run it too or this target reports itself MISSING.
ci-reach:
	./scripts/check-ci-reach.sh
