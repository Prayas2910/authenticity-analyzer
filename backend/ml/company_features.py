import re


FEATURES = [
    "url_has_numeric_id",
    "url_length",
    "has_url",
    "avg_word_length",
    "name_length",
    "word_count",
    "digit_count",
    "has_digit",
    "special_char_count",
    "uppercase_ratio",
    "is_ascii",
    "contains_ampersand",
    "contains_comma",
    "suspicious_keyword_count",
    "has_suspicious_keyword",
    "corporate_suffix_count",
    "has_corporate_suffix",
]

SUSPICIOUS_KEYWORDS = (
    "official",
    "support",
    "recruitment",
    "recruiter",
    "hiring",
    "jobs",
    "investment",
    "crypto",
    "academy",
    "consultancy",
)

CORPORATE_SUFFIXES = ("inc", "llc", "ltd", "corp", "corporation", "company", "co")

TEXT_FIELDS = (
    "company_name",
    "impersonation_target",
    "modus_operandi",
    "red_flags",
    "outreach_vector",
    "risk_severity",
)


def build_company_text(payload):
    """Build the company-specific text used by both training and prediction."""
    labels = {
        "company_name": "Company",
        "impersonation_target": "Impersonation target",
        "modus_operandi": "Reported behavior",
        "red_flags": "Red flags",
        "outreach_vector": "Outreach method",
        "risk_severity": "Risk severity",
    }
    return ". ".join(
        f"{labels[field]}: {str(payload.get(field) or '').strip()}"
        for field in TEXT_FIELDS
        if str(payload.get(field) or "").strip()
    )


def extract_features(company_name, url):
    name = str(company_name or "").strip()
    raw_url = str(url or "").strip()
    words = re.findall(r"[A-Za-z0-9]+", name)
    letters = re.findall(r"[A-Za-z]", name)
    uppercase_letters = [char for char in name if char.isalpha() and char.isupper()]
    lower_name = name.lower()
    lower_url = raw_url.lower()
    digit_count = sum(char.isdigit() for char in name)
    suspicious_count = sum(keyword in lower_name for keyword in SUSPICIOUS_KEYWORDS)
    suffix_count = sum(
        bool(re.search(rf"\b{re.escape(suffix)}\b", lower_name))
        for suffix in CORPORATE_SUFFIXES
    )

    return {
        "url_has_numeric_id": float(bool(re.search(r"/company/\d+", lower_url))),
        "url_length": float(len(raw_url)),
        "has_url": float(bool(raw_url)),
        "avg_word_length": float(sum(len(word) for word in words) / len(words)) if words else 0.0,
        "name_length": float(len(name)),
        "word_count": float(len(words)),
        "digit_count": float(digit_count),
        "has_digit": float(bool(digit_count)),
        "special_char_count": float(sum(not char.isalnum() and not char.isspace() for char in name)),
        "uppercase_ratio": float(len(uppercase_letters) / len(letters)) if letters else 0.0,
        "is_ascii": float(name.isascii()),
        "contains_ampersand": float("&" in name),
        "contains_comma": float("," in name),
        "suspicious_keyword_count": float(suspicious_count),
        "has_suspicious_keyword": float(bool(suspicious_count)),
        "corporate_suffix_count": float(suffix_count),
        "has_corporate_suffix": float(bool(suffix_count)),
    }