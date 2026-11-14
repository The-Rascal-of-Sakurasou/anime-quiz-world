import importlib.util
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("audit-anime-catalog.py")
SPEC = importlib.util.spec_from_file_location("audit_anime_catalog", MODULE_PATH)
AUDIT_MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT_MODULE)
japanese_origin = AUDIT_MODULE.japanese_origin


class JapaneseOriginAuditTests(unittest.TestCase):
    def test_japanese_origin_passes_with_or_without_marker(self):
        self.assertTrue(japanese_origin({"countryOfOrigin": "JP", "originVerified": True}))
        self.assertTrue(japanese_origin({"countryOfOrigin": "JP", "originVerified": False}))
        self.assertTrue(japanese_origin({"countryOfOrigin": "JP"}))

    def test_foreign_origin_fails_even_with_japanese_title_and_high_popularity(self):
        self.assertFalse(japanese_origin({
            "countryOfOrigin": "US",
            "popularity": 1000000,
            "title": {"native": "日本語タイトル"},
            "originVerified": True,
        }))

    def test_missing_or_unknown_origin_fails(self):
        self.assertFalse(japanese_origin({"popularity": 50000, "title": {"native": "日本語"}}))
        self.assertFalse(japanese_origin({"countryOfOrigin": ""}))
        self.assertFalse(japanese_origin({"countryOfOrigin": None}))
        self.assertFalse(japanese_origin(None))

    def test_missing_country_fails(self):
        self.assertFalse(japanese_origin({"popularity": 50000, "title": {"native": "日本語"}}))


if __name__ == "__main__":
    unittest.main()
