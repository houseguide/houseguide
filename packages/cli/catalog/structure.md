# Instruction file structure

Choose headings that fit the repository and group related guidance. A small project can combine setup with verification. A workspace with several toolchains can keep shared requirements at the root and place package specifics near the affected code.

## Scope and precedence

State which paths the guide covers, where narrower instructions live, and how overlapping rules are resolved. Place approval requirements where they apply.

## Setup and commands

List verified prerequisites and commands. Give the working directory, required arguments, and expected result when those details affect whether the command works.

## Change workflow

Describe the steps maintainers expect from investigation through review. Include exceptions or approval requirements for changes with side effects.

## Architecture and conventions

Point from common tasks to the modules that own them. Record dependency boundaries, canonical definitions, and project conventions that affect decisions.

## Verification

Tie checks to the changes they cover. Include a focused check and any broader required gate. Describe results that can appear successful even when the intended check did not run.

## Handoff and contribution

Say what a maintainer expects to see about the change, its verification, and outstanding work. Include local contribution and review requirements when they apply.

Keep shared guidance in a canonical file. A companion file can point to it when the relevant agent supports that reference format.
