import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).with_name("audit-anime-catalog.py")
SPEC = importlib.util.spec_from_file_location("aqw_catalog_audit", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)

japanese_origin = MODULE.japanese_origin

assert japanese_origin({"countryOfOrigin": "JP", "originVerified": True})
assert japanese_origin({"countryOfOrigin": "JP", "source": "ORIGINAL"})
assert japanese_origin({
    "countryOfOrigin": "JP",
    "source": "MANGA",
    "relations": {"edges": [{
        "relationType": "SOURCE",
        "node": {"type": "MANGA", "countryOfOrigin": "JP", "format": "MANGA"},
    }]},
})
assert not japanese_origin({
    "countryOfOrigin": "JP",
    "source": "MANGA",
    "relations": {"edges": [{
        "relationType": "OTHER",
        "node": {"type": "MANGA", "countryOfOrigin": "JP", "format": "MANGA"},
    }]},
})
assert not japanese_origin({
    "countryOfOrigin": "JP",
    "originVerified": True,
    "originalLanguage": "en",
})
assert not japanese_origin({
    "countryOfOrigin": "JP",
    "source": "MANGA",
    "relations": {"edges": [{
        "relationType": "SOURCE",
        "node": {
            "type": "MANGA",
            "countryOfOrigin": "JP",
            "format": "MANGA",
            "language": "en",
        },
    }]},
})
assert japanese_origin({
    "countryOfOrigin": "US",
    "popularity": 10000,
    "title": {"native": "日本語タイトル"},
})
assert not japanese_origin({
    "countryOfOrigin": "US",
    "popularity": 9999,
    "title": {"native": "日本語タイトル"},
})
assert not japanese_origin({
    "countryOfOrigin": "US",
    "popularity": 50000,
    "title": {"native": "English title"},
})
assert not japanese_origin({
    "popularity": 50000,
    "title": {"native": "日本語タイトル"},
})
print("Python AQW anime-origin policy tests passed.")
