import requests
import yaml
from datetime import datetime
from zoneinfo import ZoneInfo
import csv
from typing import Dict
import pathlib
import re
import unicodedata

def _get_vietnam_time():
    return datetime.now(ZoneInfo("Asia/Bangkok"))


def _normalize_text(text):
    text = unicodedata.normalize('NFD', text) 
    text = re.sub(r'[\u0300-\u036f]', '', text)  
    text = text.replace('đ', 'd').replace('Đ', 'D')  
    text = re.sub(r'\s+', '_', text)  
    return text

def _save_to_csv(data: Dict, city_name: str):
    now = _get_vietnam_time()
    file_name=_normalize_text(city_name)
    result_dir = pathlib.Path(f"data/{file_name}")
    result_dir.mkdir(parents=True, exist_ok=True)

    
    filename = f"aqi_{file_name}_{now.year}_{now.strftime('%b').lower()}.csv"
    filepath = result_dir / filename
    
    headers = ["timestamp", "city", "aqi", "wind_speed", "humidity", "pollutant","concentration"]
    
    file_exists = filepath.exists()
    
    with open(filepath, mode='a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        if not file_exists:
            writer.writeheader()
        writer.writerow(data)
    
    return filepath  

with open("config/map.yml", "r") as f:
    config = yaml.safe_load(f)


def _crawl_city_data(config):
    for city in config["cities"]:
        api_site=config["api_site"].replace("$_CITE_PATH_$", city["site_path"])
        id_site_res = requests.get(api_site)
        if id_site_res.status_code == 200:
            data = id_site_res.json()
            site_res=requests.get(config["api_city"].replace("$_CITY_ID_$", data["id"]))
            if site_res.status_code == 200:
                site_data=site_res.json()
                current_time = _get_vietnam_time()
                result={
                    "timestamp":current_time.isoformat(),
                    "city":city["name"],
                    "aqi":site_data["current"]["aqi"],
                    "wind_speed":site_data["current"]["wind"]["speed"],
                    "humidity":site_data["current"]["humidity"],
                    "pollutant":site_data["current"]["mainPollutant"],
                    "concentration":site_data["current"]["concentration"]
                }
                _save_to_csv(result, city["name"])

                print(result)

        else:
            print(f"Request failed with status code {city["site_path"]}")


        
if __name__ == "__main__":
    _crawl_city_data(config)



