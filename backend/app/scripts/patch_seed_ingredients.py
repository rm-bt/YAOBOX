import json
from pathlib import Path

SEED_PATH = Path("backend/app/data/verified_medicines_seed.json")

INGREDIENTS = {
    "布洛芬缓释胶囊": ("布洛芬", "Ibuprofen"),
    "布洛芬片": ("布洛芬", "Ibuprofen"),
    "对乙酰氨基酚片": ("对乙酰氨基酚", "Paracetamol / Acetaminophen"),
    "对乙酰氨基酚口服混悬液": ("对乙酰氨基酚", "Paracetamol / Acetaminophen"),
    "阿莫西林胶囊": ("阿莫西林", "Amoxicillin"),
    "头孢克洛胶囊": ("头孢克洛", "Cefaclor"),
    "头孢拉定胶囊": ("头孢拉定", "Cefradine"),
    "阿奇霉素片": ("阿奇霉素", "Azithromycin"),
    "罗红霉素胶囊": ("罗红霉素", "Roxithromycin"),
    "奥美拉唑肠溶胶囊": ("奥美拉唑", "Omeprazole"),
    "雷贝拉唑钠肠溶片": ("雷贝拉唑钠", "Rabeprazole Sodium"),
    "铝碳酸镁咀嚼片": ("铝碳酸镁", "Hydrotalcite"),
    "多潘立酮片": ("多潘立酮", "Domperidone"),
    "蒙脱石散": ("蒙脱石", "Montmorillonite"),
    "盐酸氨溴索口服溶液": ("盐酸氨溴索", "Ambroxol Hydrochloride"),
    "氯雷他定片": ("氯雷他定", "Loratadine"),
    "盐酸西替利嗪片": ("盐酸西替利嗪", "Cetirizine Hydrochloride"),
    "马来酸氯苯那敏片": ("马来酸氯苯那敏", "Chlorphenamine Maleate"),
    "地氯雷他定片": ("地氯雷他定", "Desloratadine"),
    "维生素C片": ("维生素C", "Vitamin C / Ascorbic Acid"),
    "维生素B2片": ("维生素B2", "Vitamin B2 / Riboflavin"),
    "维生素B6片": ("维生素B6", "Vitamin B6 / Pyridoxine"),
    "葡萄糖酸钙片": ("葡萄糖酸钙", "Calcium Gluconate"),
    "开塞露": ("甘油", "Glycerin"),
    "红霉素软膏": ("红霉素", "Erythromycin"),
    "莫匹罗星软膏": ("莫匹罗星", "Mupirocin"),
    "炉甘石洗剂": ("炉甘石", "Calamine"),
    "盐酸特比萘芬乳膏": ("盐酸特比萘芬", "Terbinafine Hydrochloride"),
    "阿昔洛韦乳膏": ("阿昔洛韦", "Aciclovir / Acyclovir"),
    "甲硝唑片": ("甲硝唑", "Metronidazole"),
    "左氧氟沙星片": ("左氧氟沙星", "Levofloxacin"),
    "诺氟沙星胶囊": ("诺氟沙星", "Norfloxacin"),
    "盐酸小檗碱片": ("盐酸小檗碱", "Berberine Hydrochloride"),
    "硝酸甘油片": ("硝酸甘油", "Nitroglycerin"),
    "盐酸二甲双胍片": ("盐酸二甲双胍", "Metformin Hydrochloride"),
    "阿卡波糖片": ("阿卡波糖", "Acarbose"),
    "格列齐特片": ("格列齐特", "Gliclazide"),
    "苯磺酸氨氯地平片": ("苯磺酸氨氯地平", "Amlodipine Besylate"),
    "厄贝沙坦片": ("厄贝沙坦", "Irbesartan"),
    "阿托伐他汀钙片": ("阿托伐他汀钙", "Atorvastatin Calcium"),
    "辛伐他汀片": ("辛伐他汀", "Simvastatin"),
    "硫酸沙丁胺醇气雾剂": ("硫酸沙丁胺醇", "Salbutamol Sulfate / Albuterol Sulfate"),
    "硫酸特布他林片": ("硫酸特布他林", "Terbutaline Sulfate"),
    "盐酸氟桂利嗪胶囊": ("盐酸氟桂利嗪", "Flunarizine Hydrochloride"),
    "甲钴胺片": ("甲钴胺", "Mecobalamin"),
    "盐酸氨基葡萄糖胶囊": ("盐酸氨基葡萄糖", "Glucosamine Hydrochloride"),
    "枸橼酸铋钾胶囊": ("枸橼酸铋钾", "Bismuth Potassium Citrate"),
    "盐酸洛哌丁胺胶囊": ("盐酸洛哌丁胺", "Loperamide Hydrochloride"),
    "复方氯己定含漱液": ("氯己定等复方成分", "Chlorhexidine and compound ingredients"),
    "玻璃酸钠滴眼液": ("玻璃酸钠", "Sodium Hyaluronate"),
    "左炔诺孕酮片": ("左炔诺孕酮", "Levonorgestrel"),
}

TCM_OR_COMPOUND_KEEP_UNKNOWN = {
    "连花清瘟胶囊",
    "感冒灵颗粒",
    "板蓝根颗粒",
    "藿香正气水",
    "藿香正气胶囊",
    "维C银翘片",
    "双黄连口服液",
    "蒲地蓝消炎片",
    "云南白药气雾剂",
    "复方醋酸地塞米松乳膏",
    "健胃消食片",
    "保济丸",
    "牛黄解毒片",
    "清热解毒口服液",
    "复方丹参片",
    "速效救心丸",
    "复方甘草片",
    "右美沙芬愈创甘油醚糖浆",
    "复方酮康唑软膏",
    "乳酸菌素片",
    "口服补液盐散",
}

def main() -> None:
    data = json.loads(SEED_PATH.read_text(encoding="utf-8"))

    patched = 0
    skipped = 0

    for item in data:
        name = item.get("canonical_name_zh")

        if name in INGREDIENTS:
            zh, en = INGREDIENTS[name]
            item["ingredients"] = zh
            item["ingredients_en"] = en
            patched += 1
        elif name in TCM_OR_COMPOUND_KEEP_UNKNOWN:
            item.setdefault("ingredients", None)
            item.setdefault("ingredients_en", None)
            skipped += 1
        else:
            item.setdefault("ingredients", None)
            item.setdefault("ingredients_en", None)
            skipped += 1

    SEED_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Patched ingredient fields for {patched} medicines.")
    print(f"Left {skipped} medicines as null because formula/source was not safely verified.")

if __name__ == "__main__":
    main()