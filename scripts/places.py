"""Seed "not checked yet" places from Overture Maps places.

Only names in PICK are imported, each with our category and a cleaned-up
name. Phones are dropped on purpose: a number goes live only after the
owner says yes. Duplicates, PGs and junk entries are left out by not
being listed.

Usage: python3 scripts/places.py <overture_places.json>
The input is an export with nm, lat, lng, src, lic per place.
Writes src/data/places.json.
"""
import json
import re
import sys
from pathlib import Path

PICK = {
    "Axis Bank Branch": ("bank", "Axis Bank"),
    "Axis Bank ATM": ("bank", "Axis Bank ATM"),
    "RNPD Public School": ("education", None),
    "Mavericks International School": ("education", None),
    "Hindustan Petroleum": ("fuel", "Hindustan Petroleum petrol pump"),
    "Lucky jewellers mullana": ("jewellery", "Lucky Jewellers"),
    "Shri Siddhi Vinayak Jewellers": ("jewellery", None),
    "yuvraj.jewellers.mullana": ("jewellery", "Yuvraj Jewellers"),
    "Khushboo Dental Care": ("medical", None),
    "Sameer Dental LAB": ("medical", "Sameer Dental Lab"),
    "Mmims&r Ambala Empowered by Quantzo": ("medical", "MMIMSR Hospital"),
    "Patanjali Chikitsalay": ("medical", None),
    "Mata Balasundri Mandir": ("places", "Mata Bala Sundari Mandir"),
    "Devi Mandir Mullana": ("places", "Devi Mandir"),
    "Shiva statue, Mullana": ("places", "Shiva statue"),
    "Gurudwara Shri Guru Ravidas": ("places", None),
    "New Grain Market": ("places", "New Grain Market (Anaj Mandi)"),
    "K.L Resorts": ("places", "K.L. Resorts"),
    "Innovation Media": ("services", None),
    "Apollo Tyres - Bharat Trading Company": ("auto", "Bharat Trading Company (Apollo Tyres)"),
    "Yokohama Club Network - Aggarwal Brothers": ("auto", "Aggarwal Brothers (Yokohama Tyres)"),
    "Verma Auto Center": ("auto", None),
    "Alang Motor": ("auto", None),
    "Jio-bp": ("fuel", "Jio-bp petrol pump"),
    "IndianOil": ("fuel", "IndianOil petrol pump"),
    "MMDU Academic": ("education", "MMDU academic block"),
    "Maharishi Markandeshwar University, Mullana": ("education", "Maharishi Markandeshwar University (MMDU)"),
    "Department of Law, MMDU, Mullana": ("education", "MMDU Department of Law"),
    "Arya Senior Secondary School -Mullana Ambala": ("education", "Arya Senior Secondary School"),
    "Guru Nanak Institutions ,Mullana Ambala": ("education", "Guru Nanak Institutions"),
    "Maharana Pratap National College": ("education", None),
    "Inspire Coaching Centre - Mullana": ("education", "Inspire Coaching Centre"),
    "DBMCI Ambala mulana": ("education", "DBMCI"),
    "Maharishi Markandeshwar Fitness gym": ("sports", "MM Fitness Gym"),
    "Devraj Fitness Club": ("sports", None),
    "School Times Books and Stationery": ("print", "School Times Books and Stationery"),
    "Nuvoco - Singla Traders": ("hardware", "Singla Traders"),
    "Ambala Trading Co Mullana": ("hardware", "Ambala Trading Co"),
    "Savita Bharatgas Gramin Vitrak Mullana": ("services", "Savita Bharat Gas agency"),
    "Glamour INDIA": ("salon", "Glamour India"),
    "C3 Cake, Cafe & Crunch Mullana": ("food", "C3 Cake, Cafe & Crunch"),
    "Friend's Café & Burger": ("food", None),
    "Gulati Sweet Corner": ("food", None),
    "Arushi CSC Centre": ("services", None),
    "Jain Metal & plastic store Mullana": ("general", "Jain Metal & Plastic Store"),
    "Saini Flower Decoration": ("services", None),
    "MM Continental": ("places", "MM Continental hotel"),
}


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def main(src):
    seen, out = set(), []
    places = json.load(open(src))
    for p in places:
        p["nm"] = p["nm"].strip()
    for p in sorted(places, key=lambda p: -p["conf"]):
        if p["nm"] not in PICK:
            continue
        cat, name = PICK[p["nm"]]
        name = name or p["nm"]
        if name in seen:  # the same place listed twice, keep the most confident
            continue
        seen.add(name)
        out.append({
            "slug": slug(name),
            "name": name,
            "category": cat,
            "lat": round(p["lat"], 6),
            "lng": round(p["lng"], 6),
            "source": f"Overture Maps ({p['src']}, {p['lic']})",
        })
    missing = set(PICK) - {p["nm"] for p in places}
    assert not missing, f"not in export: {missing}"
    out.sort(key=lambda p: p["name"])
    dest = Path(__file__).parent.parent / "src" / "data" / "places.json"
    json.dump(out, open(dest, "w"), ensure_ascii=False, indent=1)
    print(f"{len(out)} places -> {dest}")


if __name__ == "__main__":
    assert slug("C3 Cake, Cafe & Crunch") == "c3-cake-cafe-crunch"
    main(sys.argv[1])
