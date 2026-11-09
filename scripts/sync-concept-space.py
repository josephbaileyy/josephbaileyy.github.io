"""Refresh the public curriculum snapshot from a validated ledger checkout."""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ledger", type=Path)
    parser.add_argument("--as-of", required=True)
    args = parser.parse_args()
    ledger = args.ledger.resolve()
    data_dir = Path(__file__).resolve().parents[1] / "v4/public/learning/data"
    with tempfile.TemporaryDirectory() as work:
        export = Path(work) / "concepts.public.json"
        subprocess.run(
            [sys.executable, "scripts/concept_space.py", "--public-unified", str(export),
             "--as-of", args.as_of], cwd=ledger, check=True,
        )
        data = json.loads(export.read_text())
        # The unified export includes the timeline, but its frozen probability
        # adapter supplies section anchors instead of explicit syllabus anchors.
        # Copy only section IDs, known unit IDs and validated reader fragment IDs.
        scope = json.loads((ledger / "knowledge_graph/course_scope/stats310a-autumn-2026.json").read_text())
        sections = {section["id"]: section["reader_anchor"] for section in scope["sections"]}
        section_units = {}
        units = {unit["id"] for unit in data["syllabus_units"]["stats310a"]}
        for week in scope["weeks"]:
            if week["id"] not in units:
                raise ValueError("Unknown probability syllabus block")
            for section in week["sections"]:
                section_units.setdefault(section, []).append(week["id"])
        math_scope = json.loads(
            (ledger / "knowledge_graph/course_scope/math116-autumn-2026.json").read_text()
        )
        math_units = {unit["id"] for unit in data["syllabus_units"]["math116"]}
        for occurrence in data["occurrences"]:
            if occurrence["course"] == "math116":
                anchors = occurrence["anchors"]
                lectures = {a["topic"].rsplit(":", 1)[0] for a in anchors if a["kind"] == "lecture"}
                readings = {(a["source"], a["ref"]) for a in anchors if a["kind"] == "section"}
                explicit = {a["unit"] for a in anchors if a["kind"] == "syllabus"}
                for unit in math_scope["syllabus_units"]:
                    if unit["id"] not in math_units or unit["id"] in explicit:
                        continue
                    sections_in_unit = {(src, ref) for src, refs in unit["sections"].items() for ref in refs}
                    if readings & sections_in_unit or lectures.intersection(unit["lectures"]):
                        anchors.append({"kind": "syllabus", "unit": unit["id"], "extraction": "registry"})
                continue
            if occurrence["course"] != "stats310a":
                continue
            anchors = occurrence["anchors"]
            refs = set()
            for anchor in anchors:
                if anchor["kind"] == "section" and anchor["source"] == "dembo_probability_notes":
                    ref = anchor["ref"]
                    refs.add(ref)
                    reader = sections.get(ref)
                    if reader and re.fullmatch(r"[a-zA-Z0-9_-]+", reader):
                        anchor["reader_anchor"] = reader
            anchors.extend(
                {"kind": "syllabus", "unit": unit, "extraction": "registry"}
                for unit in sorted({u for ref in refs for u in section_units.get(ref, [])})
            )
        (data_dir / "concepts.public.json").write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
        )


if __name__ == "__main__":
    main()
