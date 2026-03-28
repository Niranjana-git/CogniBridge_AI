#!/usr/bin/env python3
"""
CogniBridge AI - System Status & Verification Tool

Verifies the current classroom assistant files are present and readable.
Run: python tools/verify_system.py
"""

import sys
from pathlib import Path


class StatusVerifier:
    def __init__(self):
        self.root = Path(__file__).parent.parent
        self.passed = []
        self.warnings = []
        self.errors = []

    def check_file_exists(self, path, description):
        full_path = self.root / path
        if full_path.exists():
            self.passed.append(f"OK {description}: {path}")
            return True

        self.errors.append(f"MISSING {description}: {path}")
        return False

    def check_html_content(self, path, required_tags):
        full_path = self.root / path
        try:
            content = full_path.read_text(encoding="utf-8")
        except Exception as exc:
            self.errors.append(f"CANNOT READ {path}: {exc}")
            return False

        missing = [tag for tag in required_tags if tag not in content]
        if missing:
            self.warnings.append(f"{path} missing: {', '.join(missing)}")
            return False

        self.passed.append(f"OK {path} contains required elements")
        return True

    def check_js_syntax(self, path):
        full_path = self.root / path
        try:
            content = full_path.read_text(encoding="utf-8")
        except Exception as exc:
            self.errors.append(f"CANNOT PARSE {path}: {exc}")
            return False

        if content.count("{") != content.count("}"):
            self.warnings.append(f"{path} may have unmatched braces")
            return False

        self.passed.append(f"OK {path} syntax check passed")
        return True

    def run_all_checks(self):
        print("\n" + "=" * 60)
        print("CogniBridge AI - System Verification")
        print("=" * 60 + "\n")

        print("Checking Core Files...")
        self.check_file_exists("index.html", "Main interface")
        self.check_file_exists("reader.html", "Reader page")
        self.check_file_exists("README.md", "Project readme")
        self.check_file_exists("js/config.js", "Configuration")
        self.check_file_exists("js/app.js", "Main app logic")
        self.check_file_exists("js/speech.js", "Speech module")
        self.check_file_exists("js/tts.js", "Text-to-speech module")
        self.check_file_exists("js/sign-translator.js", "Sign translator module")
        self.check_file_exists("js/query-center.js", "Query center module")
        self.check_file_exists("js/database.js", "Database module")
        self.check_file_exists("js/chatbot.js", "Chatbot module")
        self.check_file_exists("js/reader.js", "Reader module")
        self.check_file_exists("css/style.css", "Main styles")
        self.check_file_exists("data/isl-manifest.json", "ISL asset manifest")
        self.check_file_exists("ISL_Gifs", "ISL GIF library")
        self.check_file_exists("letters", "ISL letter library")

        print("\nChecking JavaScript Modules...")
        self.check_js_syntax("js/app.js")
        self.check_js_syntax("js/speech.js")
        self.check_js_syntax("js/tts.js")
        self.check_js_syntax("js/sign-translator.js")
        self.check_js_syntax("js/query-center.js")
        self.check_js_syntax("js/database.js")
        self.check_js_syntax("js/chatbot.js")
        self.check_js_syntax("js/reader.js")

        print("\nChecking HTML Elements...")
        self.check_html_content("index.html", [
            "transcript",
            "sign-display",
            "chat-input-field",
            "query-list",
            "file-input",
            "sign-translator.js",
            "query-center.js",
            "database.js",
            "reader.js"
        ])

    def print_summary(self):
        print("\n" + "=" * 60)
        print("VERIFICATION SUMMARY")
        print("=" * 60)

        if self.passed:
            print(f"\nPASSED ({len(self.passed)}):")
            for item in self.passed:
                print(f"  {item}")

        if self.warnings:
            print(f"\nWARNINGS ({len(self.warnings)}):")
            for item in self.warnings:
                print(f"  {item}")

        if self.errors:
            print(f"\nERRORS ({len(self.errors)}):")
            for item in self.errors:
                print(f"  {item}")

        print("\n" + "=" * 60)
        if self.errors:
            print("SYSTEM STATUS: NEEDS ATTENTION")
        else:
            print("SYSTEM STATUS: READY")
        print("=" * 60 + "\n")

        return len(self.errors) == 0

    def generate_report(self):
        report_path = self.root / "VERIFICATION_REPORT.txt"
        with report_path.open("w", encoding="utf-8") as handle:
            handle.write("CogniBridge AI - Verification Report\n")
            handle.write("=" * 60 + "\n\n")
            handle.write(f"PASSED: {len(self.passed)}\n")
            for item in self.passed:
                handle.write(f"  {item}\n")

            if self.warnings:
                handle.write(f"\nWARNINGS: {len(self.warnings)}\n")
                for item in self.warnings:
                    handle.write(f"  {item}\n")

            if self.errors:
                handle.write(f"\nERRORS: {len(self.errors)}\n")
                for item in self.errors:
                    handle.write(f"  {item}\n")

        return report_path


def main():
    verifier = StatusVerifier()

    try:
        verifier.run_all_checks()
        verifier.print_summary()
        report_path = verifier.generate_report()
        print(f"Report saved to: {report_path}\n")
        return 0 if not verifier.errors else 1
    except Exception as exc:
        print(f"\nVerification failed with error: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
