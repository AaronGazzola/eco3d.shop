# sensitive-data-masking Specification

## Purpose
TBD - created by archiving change mask-sensitive-data. Update Purpose after archive.
## Requirements
### Requirement: Sensitive values are removed before a tool result reaches the session

A tool result SHALL be rewritten before the session receives it, so that a
sensitive value never enters the transcript.

#### Scenario: A tool result carrying an account address

- **WHEN** a shell command or a database query returns a result containing an
  email address
- **THEN** the session receives the address masked
- **AND** the unmasked address appears nowhere in the transcript

#### Scenario: Output with nothing sensitive in it

- **WHEN** a tool returns output containing no sensitive value
- **THEN** the output is passed through unchanged

### Requirement: The rules match the Vids.Tube copy exactly

The masking rule file SHALL be byte-identical to the copy in `../Vids.Tube`, so
that the two repositories cannot protect different sets of values and so that
drift is detectable by comparison alone.

#### Scenario: The two copies are compared

- **WHEN** the rule file in this repository is compared with the Vids.Tube copy
- **THEN** the two are identical

#### Scenario: A rule is changed

- **WHEN** a masking rule needs changing
- **THEN** the change is made in Vids.Tube, where the tests are, and copied here

### Requirement: A value can be revealed deliberately

Revealing a value SHALL require an explicit, single-command act. Masking MUST
NOT be disableable for a whole session.

#### Scenario: Revealing for one command

- **WHEN** a command is run with the reveal switch set for that command alone
- **THEN** that command's output is returned unmasked

#### Scenario: The switch does not persist

- **WHEN** a later command runs without the reveal switch
- **THEN** that command's output is masked again

### Requirement: What the session composes is covered by a written rule

The repository guidance SHALL forbid writing a sensitive value into a reply, a
commit message, a ticket or a file without asking first.

#### Scenario: A value learned earlier in the conversation

- **WHEN** a sensitive value would be written into a reply
- **THEN** confirmation is sought before the value is written

