import importlib.util
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("audit-anime-catalog.py")
SPEC = importlib.util.spec_from_file_location("audit_anime_catalog", MODULE_PATH)
AUDIT_MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT_MODULE)
japanese_origin = AUDIT_MODULE.japanese_origin


class JapaneseOriginAuditTests(unittest.TestCase):
    def test_verified_japanese_record_passes(self):
        self.assertTrue(japanese_origin({"countryOfOrigin": "JP", "originVerified": True}))

    def test_unverified_japanese_record_fails(self):
        self.assertFalse(japanese_origin({"countryOfOrigin": "JP", "originVerified": False}))
        self.assertFalse(japanese_origin({"countryOfOrigin": "JP"}))

    def test_famous_foreign_record_with_japanese_title_passes(self):
        self.assertTrue(japanese_origin({
            "countryOfOrigin": "US",
            "popularity": 10000,
            "title": {"native": "日本語タイトル"},
        }))

    def test_foreign_record_below_popularity_threshold_fails(self):
        self.assertFalse(japanese_origin({
            "countryOfOrigin": "US",
            "popularity": 9999,
            "title": {"native": "日本語タイトル"},
        }))

    def test_foreign_record_without_japanese_title_fails(self):
        self.assertFalse(japanese_origin({
            "countryOfOrigin": "US",
            "popularity": 50000,
            "title": {"native": "English title"},
        }))

    def test_missing_country_fails(self):
        self.assertFalse(japanese_origin({"popularity": 50000, "title": {"native": "日本語"}}))


if __name__ == "__main__":
    unittest.main()
