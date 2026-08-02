## ADDED Requirements

### Requirement: Studio stepper includes an Animate step

The studio stepper (`SidebarShell`) SHALL present three steps in order: Pick (`/admin/pick`), Group (`/admin/group`), and Animate (`/admin/animate`). The Animate step SHALL be enabled only once the loaded rig has groups.

#### Scenario: Animate step gated on groups

- **WHEN** a rig has no groups
- **THEN** the Animate step is disabled

#### Scenario: Animate step reachable after grouping

- **WHEN** the loaded rig has groups
- **THEN** the stepper shows step 3 "Animate" enabled, navigating to `/admin/animate`
