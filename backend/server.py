from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============== Helpers ==============
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return str(uuid.uuid4())


# ============== Models ==============
class Ingredient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    name: str
    unit: str
    price_per_unit: float
    stock: float = 0
    low_stock_threshold: float = 0
    expiry_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class IngredientCreate(BaseModel):
    name: str
    unit: str
    price_per_unit: float
    stock: float = 0
    low_stock_threshold: float = 0
    expiry_date: Optional[str] = None
    notes: Optional[str] = None


class Packaging(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    name: str
    price_per_unit: float
    stock: float = 0
    low_stock_threshold: float = 0
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class PackagingCreate(BaseModel):
    name: str
    price_per_unit: float
    stock: float = 0
    low_stock_threshold: float = 0
    notes: Optional[str] = None


class RecipeIngredient(BaseModel):
    ingredient_id: str
    qty: float


class RecipePackaging(BaseModel):
    packaging_id: str
    qty: float = 1


class Menu(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    ingredients: List[RecipeIngredient] = []
    packaging: List[RecipePackaging] = []
    labor_cost: float = 0  # per unit
    overhead_cost: float = 0  # per unit (gas, listrik, dll)
    margin_target_pct: float = 60
    platform_fee_pct: float = 20
    selling_price: float = 0
    use_recommended_price: bool = True
    yield_per_batch: float = 1  # 1 batch resep menghasilkan brp porsi
    active: bool = True
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class MenuCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    ingredients: List[RecipeIngredient] = []
    packaging: List[RecipePackaging] = []
    labor_cost: float = 0
    overhead_cost: float = 0
    margin_target_pct: float = 60
    platform_fee_pct: float = 20
    selling_price: float = 0
    use_recommended_price: bool = True
    yield_per_batch: float = 1
    active: bool = True


class SaleItem(BaseModel):
    menu_id: str
    menu_name: str  # snapshot
    qty: int
    price: float  # snapshot per unit
    hpp_snapshot: float = 0  # snapshot HPP per unit


class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    date: str  # ISO string YYYY-MM-DD
    channel: str = "shopeefood"  # shopeefood, gofood, grabfood, dine-in, other
    items: List[SaleItem]
    subtotal: float
    platform_fee: float = 0
    discount: float = 0
    total: float  # net received
    total_hpp: float = 0
    profit: float = 0
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class SaleCreate(BaseModel):
    date: str
    channel: str = "shopeefood"
    items: List[SaleItem]
    discount: float = 0
    notes: Optional[str] = None


class InvoiceItem(BaseModel):
    name: str
    qty: float
    price: float


class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    invoice_number: str
    date: str
    due_date: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    items: List[InvoiceItem]
    subtotal: float
    discount: float = 0
    tax_pct: float = 0
    tax_amount: float = 0
    total: float
    status: str = "unpaid"  # unpaid, paid, cancelled
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class InvoiceCreate(BaseModel):
    date: str
    due_date: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    items: List[InvoiceItem]
    discount: float = 0
    tax_pct: float = 0
    status: str = "unpaid"
    notes: Optional[str] = None


class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "default"
    business_name: str = "Kukus.In"
    business_tagline: str = "Healthy Steamed Food"
    business_address: str = ""
    business_phone: str = ""
    business_email: str = ""
    default_margin_pct: float = 60
    default_platform_fee_pct: float = 20
    updated_at: str = Field(default_factory=now_iso)


# ============== HPP Helper ==============
async def compute_hpp(menu: dict) -> dict:
    """Compute HPP, recommended price, profit estimation for a menu."""
    ingredients_cost = 0.0
    breakdown_ing = []
    for ri in menu.get("ingredients", []):
        ing = await db.ingredients.find_one({"id": ri["ingredient_id"]}, {"_id": 0})
        if ing:
            cost = ing["price_per_unit"] * ri["qty"]
            ingredients_cost += cost
            breakdown_ing.append({
                "ingredient_id": ri["ingredient_id"],
                "name": ing["name"],
                "qty": ri["qty"],
                "unit": ing["unit"],
                "price_per_unit": ing["price_per_unit"],
                "cost": cost,
            })

    packaging_cost = 0.0
    breakdown_pack = []
    for rp in menu.get("packaging", []):
        pk = await db.packaging.find_one({"id": rp["packaging_id"]}, {"_id": 0})
        if pk:
            cost = pk["price_per_unit"] * rp["qty"]
            packaging_cost += cost
            breakdown_pack.append({
                "packaging_id": rp["packaging_id"],
                "name": pk["name"],
                "qty": rp["qty"],
                "price_per_unit": pk["price_per_unit"],
                "cost": cost,
            })

    labor = float(menu.get("labor_cost", 0) or 0)
    overhead = float(menu.get("overhead_cost", 0) or 0)
    yield_n = max(float(menu.get("yield_per_batch", 1) or 1), 1)
    # Bahan dibagi yield (batch cooking), packaging tetap per porsi
    hpp = (ingredients_cost / yield_n) + packaging_cost + (labor / yield_n) + (overhead / yield_n)

    margin = float(menu.get("margin_target_pct", 60) or 0) / 100.0
    fee = float(menu.get("platform_fee_pct", 0) or 0) / 100.0

    # Selling price formula:
    # We want: net_after_fee = price * (1 - fee), and net_after_fee - hpp = margin * net_after_fee
    # => net_after_fee = hpp / (1 - margin)
    # => price = net_after_fee / (1 - fee) = hpp / ((1 - margin) * (1 - fee))
    denom = (1 - margin) * (1 - fee)
    if denom <= 0:
        recommended_price = hpp * 2
    else:
        recommended_price = hpp / denom
    # round up to nearest 500
    recommended_price = int((recommended_price + 499) // 500 * 500) if recommended_price > 0 else 0

    use_rec = menu.get("use_recommended_price", True)
    selling = recommended_price if use_rec else float(menu.get("selling_price", 0) or 0)

    net_per_unit = selling * (1 - fee)
    profit_per_unit = net_per_unit - hpp
    profit_margin_pct = (profit_per_unit / net_per_unit * 100) if net_per_unit > 0 else 0

    # Psychological price suggestions (3 options)
    psych_prices = []
    if recommended_price > 0:
        base = int(recommended_price)
        candidates = sorted(set([
            ((base // 1000) * 1000) + 500,
            ((base // 1000) * 1000) + 900,
            ((base // 1000 + 1) * 1000) - 100,
            ((base // 1000 + 1) * 1000) + 500,
        ]))
        # Pick 3 closest >= recommended_price - 200
        psych_prices = [c for c in candidates if c >= recommended_price - 200][:3]

    return {
        "ingredients_cost": ingredients_cost,
        "packaging_cost": packaging_cost,
        "labor_cost": labor,
        "overhead_cost": overhead,
        "yield_per_batch": yield_n,
        "hpp": hpp,
        "recommended_price": recommended_price,
        "psychological_prices": psych_prices,
        "selling_price": selling,
        "net_per_unit": net_per_unit,
        "profit_per_unit": profit_per_unit,
        "profit_margin_pct": profit_margin_pct,
        "breakdown_ingredients": breakdown_ing,
        "breakdown_packaging": breakdown_pack,
    }


# ============== Ingredients ==============
@api_router.get("/ingredients")
async def list_ingredients():
    docs = await db.ingredients.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return docs


@api_router.post("/ingredients")
async def create_ingredient(data: IngredientCreate):
    obj = Ingredient(**data.model_dump())
    await db.ingredients.insert_one(obj.model_dump())
    return obj


@api_router.put("/ingredients/{ing_id}")
async def update_ingredient(ing_id: str, data: IngredientCreate):
    update = data.model_dump()
    update["updated_at"] = now_iso()
    result = await db.ingredients.update_one({"id": ing_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.ingredients.find_one({"id": ing_id}, {"_id": 0})
    return doc


@api_router.delete("/ingredients/{ing_id}")
async def delete_ingredient(ing_id: str):
    await db.ingredients.delete_one({"id": ing_id})
    return {"ok": True}


# ============== Packaging ==============
@api_router.get("/packaging")
async def list_packaging():
    docs = await db.packaging.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return docs


@api_router.post("/packaging")
async def create_packaging(data: PackagingCreate):
    obj = Packaging(**data.model_dump())
    await db.packaging.insert_one(obj.model_dump())
    return obj


@api_router.put("/packaging/{pk_id}")
async def update_packaging(pk_id: str, data: PackagingCreate):
    update = data.model_dump()
    update["updated_at"] = now_iso()
    result = await db.packaging.update_one({"id": pk_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.packaging.find_one({"id": pk_id}, {"_id": 0})
    return doc


@api_router.delete("/packaging/{pk_id}")
async def delete_packaging(pk_id: str):
    await db.packaging.delete_one({"id": pk_id})
    return {"ok": True}


# ============== Menus ==============
@api_router.get("/menus")
async def list_menus():
    docs = await db.menus.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    enriched = []
    for d in docs:
        hpp = await compute_hpp(d)
        enriched.append({**d, "computed": hpp})
    return enriched


@api_router.get("/menus/{menu_id}")
async def get_menu(menu_id: str):
    doc = await db.menus.find_one({"id": menu_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    hpp = await compute_hpp(doc)
    return {**doc, "computed": hpp}


@api_router.post("/menus")
async def create_menu(data: MenuCreate):
    obj = Menu(**data.model_dump())
    await db.menus.insert_one(obj.model_dump())
    hpp = await compute_hpp(obj.model_dump())
    return {**obj.model_dump(), "computed": hpp}


@api_router.put("/menus/{menu_id}")
async def update_menu(menu_id: str, data: MenuCreate):
    update = data.model_dump()
    update["updated_at"] = now_iso()
    result = await db.menus.update_one({"id": menu_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.menus.find_one({"id": menu_id}, {"_id": 0})
    hpp = await compute_hpp(doc)
    return {**doc, "computed": hpp}


@api_router.delete("/menus/{menu_id}")
async def delete_menu(menu_id: str):
    await db.menus.delete_one({"id": menu_id})
    return {"ok": True}


@api_router.post("/menus/preview-hpp")
async def preview_hpp(data: MenuCreate):
    return await compute_hpp(data.model_dump())


# ============== Sales ==============
@api_router.get("/sales")
async def list_sales(start: Optional[str] = None, end: Optional[str] = None):
    q = {}
    if start or end:
        q["date"] = {}
        if start:
            q["date"]["$gte"] = start
        if end:
            q["date"]["$lte"] = end
    docs = await db.sales.find(q, {"_id": 0}).sort("date", -1).to_list(5000)
    return docs


@api_router.post("/sales")
async def create_sale(data: SaleCreate):
    subtotal = 0.0
    total_hpp = 0.0
    platform_fee_pct_acc = 0.0
    weighted_count = 0

    enriched_items = []
    for it in data.items:
        menu = await db.menus.find_one({"id": it.menu_id}, {"_id": 0})
        if not menu:
            raise HTTPException(status_code=400, detail=f"Menu {it.menu_id} not found")
        computed = await compute_hpp(menu)
        line_total = it.price * it.qty
        line_hpp = computed["hpp"] * it.qty
        subtotal += line_total
        total_hpp += line_hpp
        platform_fee_pct_acc += float(menu.get("platform_fee_pct", 0)) * line_total
        weighted_count += line_total
        enriched_items.append(SaleItem(
            menu_id=it.menu_id,
            menu_name=menu["name"],
            qty=it.qty,
            price=it.price,
            hpp_snapshot=computed["hpp"],
        ))

        # Deduct stock for ingredients & packaging
        for ri in menu.get("ingredients", []):
            await db.ingredients.update_one(
                {"id": ri["ingredient_id"]},
                {"$inc": {"stock": -ri["qty"] * it.qty}}
            )
        for rp in menu.get("packaging", []):
            await db.packaging.update_one(
                {"id": rp["packaging_id"]},
                {"$inc": {"stock": -rp["qty"] * it.qty}}
            )

    # Platform fee: use channel-aware default - if channel is dine-in/other set 0
    if data.channel in ("dine-in", "other", "cash"):
        platform_fee = 0
    else:
        # weighted avg platform fee from menus, fallback to 20%
        if weighted_count > 0:
            avg_fee_pct = platform_fee_pct_acc / weighted_count
        else:
            avg_fee_pct = 20
        platform_fee = subtotal * (avg_fee_pct / 100.0)

    total = subtotal - platform_fee - data.discount
    profit = total - total_hpp

    sale = Sale(
        date=data.date,
        channel=data.channel,
        items=enriched_items,
        subtotal=subtotal,
        platform_fee=platform_fee,
        discount=data.discount,
        total=total,
        total_hpp=total_hpp,
        profit=profit,
        notes=data.notes,
    )
    await db.sales.insert_one(sale.model_dump())
    return sale


@api_router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: str):
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Not found")
    # restore stock
    for it in sale.get("items", []):
        menu = await db.menus.find_one({"id": it["menu_id"]}, {"_id": 0})
        if menu:
            for ri in menu.get("ingredients", []):
                await db.ingredients.update_one(
                    {"id": ri["ingredient_id"]},
                    {"$inc": {"stock": ri["qty"] * it["qty"]}}
                )
            for rp in menu.get("packaging", []):
                await db.packaging.update_one(
                    {"id": rp["packaging_id"]},
                    {"$inc": {"stock": rp["qty"] * it["qty"]}}
                )
    await db.sales.delete_one({"id": sale_id})
    return {"ok": True}


# ============== Invoices ==============
async def gen_invoice_number():
    today = datetime.now(timezone.utc).strftime("%Y%m")
    count = await db.invoices.count_documents({})
    return f"INV-{today}-{count + 1:04d}"


@api_router.get("/invoices")
async def list_invoices():
    docs = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.get("/invoices/{inv_id}")
async def get_invoice(inv_id: str):
    doc = await db.invoices.find_one({"id": inv_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@api_router.post("/invoices")
async def create_invoice(data: InvoiceCreate):
    subtotal = sum(i.qty * i.price for i in data.items)
    tax_amount = (subtotal - data.discount) * (data.tax_pct / 100.0)
    total = subtotal - data.discount + tax_amount
    inv_num = await gen_invoice_number()
    inv = Invoice(
        invoice_number=inv_num,
        date=data.date,
        due_date=data.due_date,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_address=data.customer_address,
        items=data.items,
        subtotal=subtotal,
        discount=data.discount,
        tax_pct=data.tax_pct,
        tax_amount=tax_amount,
        total=total,
        status=data.status,
        notes=data.notes,
    )
    await db.invoices.insert_one(inv.model_dump())
    return inv


@api_router.put("/invoices/{inv_id}/status")
async def update_invoice_status(inv_id: str, body: Dict[str, str]):
    status = body.get("status", "unpaid")
    result = await db.invoices.update_one({"id": inv_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api_router.delete("/invoices/{inv_id}")
async def delete_invoice(inv_id: str):
    await db.invoices.delete_one({"id": inv_id})
    return {"ok": True}


# ============== Settings ==============
@api_router.get("/settings")
async def get_settings():
    doc = await db.settings.find_one({"id": "default"}, {"_id": 0})
    if not doc:
        s = Settings()
        await db.settings.insert_one(s.model_dump())
        return s
    return doc


@api_router.put("/settings")
async def update_settings(data: Settings):
    update = data.model_dump()
    update["id"] = "default"
    update["updated_at"] = now_iso()
    await db.settings.update_one({"id": "default"}, {"$set": update}, upsert=True)
    return update


# ============== Operating Costs (Biaya Operasional Non-Bahan) ==============
class OperatingCost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    name: str
    category: str = "other"  # rent, utility, salary, marketing, equipment, other
    amount: float
    frequency: str = "monthly"  # monthly, daily, one-time
    date: str  # YYYY-MM-DD
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class OperatingCostCreate(BaseModel):
    name: str
    category: str = "other"
    amount: float
    frequency: str = "monthly"
    date: str
    notes: Optional[str] = None


@api_router.get("/operating-costs")
async def list_op_costs():
    docs = await db.operating_costs.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
    return docs


@api_router.post("/operating-costs")
async def create_op_cost(data: OperatingCostCreate):
    obj = OperatingCost(**data.model_dump())
    await db.operating_costs.insert_one(obj.model_dump())
    return obj


@api_router.delete("/operating-costs/{cid}")
async def delete_op_cost(cid: str):
    await db.operating_costs.delete_one({"id": cid})
    return {"ok": True}


# ============== Purchases / Restock ==============
class Purchase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    ingredient_id: str
    ingredient_name: str
    qty: float
    price_per_unit: float
    total_cost: float
    date: str
    supplier: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class PurchaseCreate(BaseModel):
    ingredient_id: str
    qty: float
    price_per_unit: float
    date: str
    supplier: Optional[str] = None
    notes: Optional[str] = None


@api_router.get("/purchases")
async def list_purchases():
    docs = await db.purchases.find({}, {"_id": 0}).sort("date", -1).to_list(2000)
    return docs


@api_router.post("/purchases")
async def create_purchase(data: PurchaseCreate):
    ing = await db.ingredients.find_one({"id": data.ingredient_id}, {"_id": 0})
    if not ing:
        raise HTTPException(status_code=404, detail="Bahan tidak ditemukan")
    total = data.qty * data.price_per_unit
    # Moving average cost update
    old_stock = float(ing.get("stock", 0))
    old_price = float(ing.get("price_per_unit", 0))
    new_stock = old_stock + data.qty
    if new_stock > 0:
        new_price = (old_stock * old_price + data.qty * data.price_per_unit) / new_stock
    else:
        new_price = data.price_per_unit
    await db.ingredients.update_one(
        {"id": data.ingredient_id},
        {"$set": {"stock": new_stock, "price_per_unit": new_price, "updated_at": now_iso()}}
    )
    purchase = Purchase(
        ingredient_id=data.ingredient_id,
        ingredient_name=ing["name"],
        qty=data.qty,
        price_per_unit=data.price_per_unit,
        total_cost=total,
        date=data.date,
        supplier=data.supplier,
        notes=data.notes,
    )
    await db.purchases.insert_one(purchase.model_dump())
    return purchase


@api_router.delete("/purchases/{pid}")
async def delete_purchase(pid: str):
    pur = await db.purchases.find_one({"id": pid}, {"_id": 0})
    if not pur:
        raise HTTPException(status_code=404, detail="Not found")
    # rollback stock (gak rollback harga karena moving avg susah dikomposisi)
    await db.ingredients.update_one(
        {"id": pur["ingredient_id"]},
        {"$inc": {"stock": -pur["qty"]}}
    )
    await db.purchases.delete_one({"id": pid})
    return {"ok": True}


# ============== Customers ==============
class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    customer_type: str = "regular"  # regular, catering, corporate
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    customer_type: str = "regular"
    notes: Optional[str] = None


@api_router.get("/customers")
async def list_customers():
    docs = await db.customers.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return docs


@api_router.post("/customers")
async def create_customer(data: CustomerCreate):
    obj = Customer(**data.model_dump())
    await db.customers.insert_one(obj.model_dump())
    return obj


@api_router.put("/customers/{cid}")
async def update_customer(cid: str, data: CustomerCreate):
    await db.customers.update_one({"id": cid}, {"$set": data.model_dump()})
    doc = await db.customers.find_one({"id": cid}, {"_id": 0})
    return doc


@api_router.delete("/customers/{cid}")
async def delete_customer(cid: str):
    await db.customers.delete_one({"id": cid})
    return {"ok": True}


# ============== Reports: P&L, Break-Even, Promo ROI ==============
@api_router.get("/reports/pnl")
async def pnl_report(month: str):
    """month format: YYYY-MM. Computes real P&L for the month."""
    start = f"{month}-01"
    # find end of month
    year, mon = int(month[:4]), int(month[5:7])
    if mon == 12:
        next_m = f"{year + 1}-01-01"
    else:
        next_m = f"{year}-{mon + 1:02d}-01"
    end_date = (datetime.fromisoformat(next_m) - timedelta(days=1)).date().isoformat()

    sales = await db.sales.find({"date": {"$gte": start, "$lte": end_date}}, {"_id": 0}).to_list(10000)
    revenue = sum(s["total"] for s in sales)
    cogs = sum(s["total_hpp"] for s in sales)
    gross_profit = revenue - cogs

    op = await db.operating_costs.find({"date": {"$gte": start, "$lte": end_date}}, {"_id": 0}).to_list(1000)
    op_total = sum(o["amount"] for o in op)
    op_by_cat = defaultdict(float)
    for o in op:
        op_by_cat[o["category"]] += o["amount"]

    net_profit = gross_profit - op_total
    net_margin_pct = (net_profit / revenue * 100) if revenue > 0 else 0

    return {
        "month": month,
        "start_date": start,
        "end_date": end_date,
        "revenue": revenue,
        "cogs": cogs,
        "gross_profit": gross_profit,
        "gross_margin_pct": (gross_profit / revenue * 100) if revenue > 0 else 0,
        "operating_costs_total": op_total,
        "operating_costs_by_category": [{"category": k, "amount": v} for k, v in op_by_cat.items()],
        "net_profit": net_profit,
        "net_margin_pct": net_margin_pct,
        "total_orders": len(sales),
    }


@api_router.get("/reports/break-even")
async def break_even(fixed_cost: float, menu_id: Optional[str] = None):
    """Hitung jumlah porsi minimum per hari & per bulan untuk balik modal."""
    # if menu specified, use that profit/unit; else use weighted avg from sales last 30d
    profit_per_unit = 0
    avg_price = 0
    if menu_id:
        menu = await db.menus.find_one({"id": menu_id}, {"_id": 0})
        if menu:
            c = await compute_hpp(menu)
            profit_per_unit = c["profit_per_unit"]
            avg_price = c["selling_price"]
    else:
        end = datetime.now(timezone.utc).date()
        start = end - timedelta(days=30)
        sales = await db.sales.find({"date": {"$gte": start.isoformat()}}, {"_id": 0}).to_list(5000)
        total_qty = sum(sum(it["qty"] for it in s["items"]) for s in sales)
        total_profit = sum(s["profit"] for s in sales)
        total_rev = sum(s["total"] for s in sales)
        profit_per_unit = (total_profit / total_qty) if total_qty > 0 else 0
        avg_price = (total_rev / total_qty) if total_qty > 0 else 0

    if profit_per_unit <= 0:
        return {"error": "Profit per unit 0 atau negatif. Tambahkan data atau pilih menu.", "porsi_per_bulan": None, "porsi_per_hari": None}

    porsi_bulan = fixed_cost / profit_per_unit
    return {
        "fixed_cost": fixed_cost,
        "profit_per_unit": profit_per_unit,
        "avg_price": avg_price,
        "porsi_per_bulan": porsi_bulan,
        "porsi_per_hari": porsi_bulan / 30,
        "revenue_target_per_bulan": porsi_bulan * avg_price,
    }


@api_router.get("/reports/promo-roi")
async def promo_roi(menu_id: str, discount_pct: float):
    """Hitung berapa porsi extra harus terjual setelah kasih diskon."""
    menu = await db.menus.find_one({"id": menu_id}, {"_id": 0})
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    c = await compute_hpp(menu)
    normal_price = c["selling_price"]
    normal_profit = c["profit_per_unit"]
    promo_price = normal_price * (1 - discount_pct / 100)
    fee_pct = float(menu.get("platform_fee_pct", 0)) / 100
    promo_net = promo_price * (1 - fee_pct)
    promo_profit = promo_net - c["hpp"]

    if promo_profit <= 0:
        multiplier = None
        warning = "⚠️ Promo ini bikin RUGI per porsi! Jangan diteruskan."
    elif normal_profit <= 0:
        multiplier = None
        warning = "Menu ini belum profitable normal."
    else:
        multiplier = normal_profit / promo_profit
        warning = None

    return {
        "menu_id": menu_id,
        "menu_name": menu["name"],
        "normal_price": normal_price,
        "normal_profit_per_unit": normal_profit,
        "discount_pct": discount_pct,
        "promo_price": promo_price,
        "promo_profit_per_unit": promo_profit,
        "extra_volume_multiplier": multiplier,
        "warning": warning,
    }


# ============== Dashboard ==============
@api_router.get("/dashboard/stats")
async def dashboard_stats(period: str = "30d"):
    days = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}.get(period, 30)
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days - 1)
    start_iso = start.isoformat()
    end_iso = end.isoformat()

    sales = await db.sales.find(
        {"date": {"$gte": start_iso, "$lte": end_iso}},
        {"_id": 0}
    ).to_list(10000)

    total_revenue = sum(s["total"] for s in sales)
    total_hpp = sum(s["total_hpp"] for s in sales)
    total_profit = sum(s["profit"] for s in sales)
    total_orders = len(sales)
    total_items_sold = sum(sum(i["qty"] for i in s["items"]) for s in sales)
    margin_pct = (total_profit / total_revenue * 100) if total_revenue > 0 else 0

    # Sales trend (daily)
    trend = defaultdict(lambda: {"revenue": 0, "profit": 0, "orders": 0})
    for s in sales:
        d = s["date"]
        trend[d]["revenue"] += s["total"]
        trend[d]["profit"] += s["profit"]
        trend[d]["orders"] += 1
    # Fill missing days
    trend_list = []
    cursor = start
    while cursor <= end:
        key = cursor.isoformat()
        t = trend.get(key, {"revenue": 0, "profit": 0, "orders": 0})
        trend_list.append({"date": key, **t})
        cursor += timedelta(days=1)

    # Best sellers
    best = defaultdict(lambda: {"qty": 0, "revenue": 0, "name": ""})
    for s in sales:
        for it in s["items"]:
            best[it["menu_id"]]["qty"] += it["qty"]
            best[it["menu_id"]]["revenue"] += it["qty"] * it["price"]
            best[it["menu_id"]]["name"] = it["menu_name"]
    best_list = sorted(
        [{"menu_id": k, **v} for k, v in best.items()],
        key=lambda x: x["qty"], reverse=True
    )[:5]

    # Channel breakdown
    channel = defaultdict(lambda: {"revenue": 0, "orders": 0})
    for s in sales:
        channel[s["channel"]]["revenue"] += s["total"]
        channel[s["channel"]]["orders"] += 1
    channel_list = [{"channel": k, **v} for k, v in channel.items()]

    # Low stock alerts
    low_ing = await db.ingredients.find(
        {"$expr": {"$lte": ["$stock", "$low_stock_threshold"]}},
        {"_id": 0}
    ).to_list(100)
    low_pack = await db.packaging.find(
        {"$expr": {"$lte": ["$stock", "$low_stock_threshold"]}},
        {"_id": 0}
    ).to_list(100)

    return {
        "period": period,
        "start_date": start_iso,
        "end_date": end_iso,
        "total_revenue": total_revenue,
        "total_hpp": total_hpp,
        "total_profit": total_profit,
        "margin_pct": margin_pct,
        "total_orders": total_orders,
        "total_items_sold": total_items_sold,
        "trend": trend_list,
        "best_sellers": best_list,
        "channels": channel_list,
        "low_stock_ingredients": low_ing,
        "low_stock_packaging": low_pack,
    }


@api_router.get("/")
async def root():
    return {"message": "Kukus.In Financial API", "ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
