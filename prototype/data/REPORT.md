# Data Extraction Report: CMS Collision Events for WebGL Display

This report documents the extraction of real proton-proton collision events from the CMS Open Data portal for use in a WebGL-based event display.

## Source & License
- **Source Record**: [CERN Open Data Portal Record 303](https://opendata.cern.ch/record/303) ("Events with two muons from 2010")
- **Dataset DOI**: [10.7483/OPENDATA.CMS.4M97.3SQ9](http://doi.org/10.7483/OPENDATA.CMS.4M97.3SQ9)
- **License**: [Creative Commons Zero v1.0 Universal (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/)

## Extracted Counts & Metrics
- **Events**: 15 visually interesting events selected by highest track multiplicity
- **Total Tracks**: 3,706
- **Total Muons**: 20 (all from the `GlobalMuons_V1` collection)
- **Total Calorimeter Hits**: 600 (exactly 40 highest-$E_T$ entries per event)
- **Output Files**:
  - [events.json](file:///Users/josephbailey/.claude-personal/jobs/0a088b19/tmp/events/events.json) (197.7 KB)
  - [REPORT.md](file:///Users/josephbailey/.claude-personal/jobs/0a088b19/tmp/events/REPORT.md)

## Extraction Details & Mapping logic
1. **Event Identifiers**: Run and event numbers were extracted from the `Event_V2` collection under the format `run:event`.
2. **Tracks**: Extracted from the `Tracks_V2` collection. We selected the transverse momentum (`pt`), pseudorapidity (`eta`), phi angle (`phi`), and charge (`charge` / `q`). All values are rounded to 3 decimal places.
3. **Muons**: Extracted from the `GlobalMuons_V1` collection, mapping `pt`, `eta`, `phi`, and `charge`.
4. **Calorimeter Hits**: Extracted from `CaloTowers_V2`. For each tower, the total transverse energy $E_T$ was split into `ecal` (electromagnetic calorimeter) and `hcal` (hadronic calorimeter) components according to the ratio of `emEnergy` and `hadEnergy` to the total energy (`emEnergy + hadEnergy`). To satisfy size budgets, calo hits were sorted by $E_T$ descending and capped at the top 40 highest-$E_T$ entries per event.

## Caveats & Cleaning Process
- **Non-Standard JSON Syntax**: The original CMS iSpy `.ig` files (which are Zip archives containing JSON-like event files) contain non-standard JSON syntax:
  - Vector/coordinate values are serialized as tuples with parentheses `(x, y, z)` instead of square brackets `[x, y, z]`. These were converted to valid JSON arrays.
  - Some missing/undefined float quantities are serialized as `nan`, which is invalid in standard JSON. These were replaced with `null` using word-boundary regular expressions before parsing.
- **Physics Interpretability**: The dataset is intended for educational/outreach event display purposes and has been simplified. It contains a subset of total event information and should not be used for rigorous physics analysis.
