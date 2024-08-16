import requests
import json
import wikitextparser as wtp
import re


def trim(string: str) -> str:
    return string.strip()


def yes(string: str) -> bool:
    return bool(re.search(r"{{yes", string))


url = f"https://wiki.openstreetmap.org/w/api.php?action=parse&page=Software/Desktop&prop=wikitext&format=json"
response = requests.get(url)
data = response.json()
wikitext = data["parse"]["wikitext"]["*"]
parsed = wtp.parse(wikitext)
table = parsed.sections[1].tables[0].data()


def getLicense(cell: str) -> str:
    data = wtp.parse(cell).templates[0].arguments
    if not data:
        return ""
    return data[0].value


def getPrice(cell: str) -> str:
    data = wtp.parse(cell).templates[0].arguments
    if not data:
        return ""
    price = data[0].value
    if price[0] != "{":
        return price

    data = wtp.parse(price)
    return data.templates[0].arguments[0].value

fullData = []

for row in table[1:50]:
    if not yes(row[14]):
        continue

    data = {
        "page": wtp.parse(row[0]).wikilinks[0].title,
        "name": wtp.parse(row[0]).wikilinks[0].text
        or wtp.parse(row[0]).wikilinks[0].title,
        "category": list(map(trim, row[1].split(";"))),
        "screenshot": wtp.parse(row[2]).wikilinks[0].title if row[2] else "",
        "windows": yes(row[3]),
        "mac": yes(row[4]),
        "linux": yes(row[5]),
        # "framework": wtp.parse(row[6]).string
        "display": yes(row[7]),
        "navigate": yes(row[8]),
        "makeTrack": yes(row[9]),
        "monitor": yes(row[10]),
        "license": getLicense(row[11]),
        "price": getPrice(row[12]),
        "languages": list(map(trim, row[13].split(";"))) if row[13][0] != "{" else [],
        "discreption" : row[15]
     }
    fullData.append(data)


json.dump(fullData, open("data.json", "w"))
