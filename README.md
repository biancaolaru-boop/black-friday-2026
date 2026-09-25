# 🚀 AI Hackathon: Special Black Friday 2026 Prediction Engine

Un tablou de bord interactiv și inteligent pentru previziunea performanțelor de **Black Friday 2026**, fundamentat pe date reale din **Google BigQuery** (edițiile 2024 & 2025).

---

## 🌟 Funcționalități Cheie

- **📈 Simulator Interactiv de Creștere YoY (+0% la +50%):** Recalculare în timp real a veniturilor, comisioanelor, clicurilor și numărului de comenzi prognozate pentru 2026.
- **🏷️ Filtru Dinamic pe Nișe E-Commerce:** Filtrare pe 10 categorii (IT&C, Fashion, Beauty, Home & Garden, etc.) cu recalculare instantanee a tuturor graficelor și KPI-urilor.
- **📱 Modul 1: Dispozitive (Mobile vs Desktop):** Distribuție dinamică a traficului de achiziție per categorie.
- **🛒 Modul 2: Valoare Medie Coș (AOV pe Categorie):** Identificarea categoriilor cu cel mai mare coș mediu per comandă.
- **🛡️ Modul 3: Rată de Aprobare & Retur Comenzi:** Reconciliere financiară bazată pe date istorice din BigQuery.
- **📢 Modul 4: Mix Canale de Afiliere & Publisheri:** Ponderi pe Google Shopping, Rețele Sociale, Cupoane & Cashbacks.
- **🎟️ Modul 5: Penetrare Vouchere & Coduri Promo:** Analiză comenzi cu cupon vs discount direct.
- **🤖 BlackBear AI Assistant:** Asistent chatbot integrat, capabil să răspundă la întrebări strategice bazate pe datele BigQuery.
- **⏱️ Numărătoare Inversă Black Friday 2026:** Numărătoare inversă live până la Vineri, 6 Noiembrie 2026.

---

## 📊 Sursa Datelor (BigQuery)

- **Project ID:** `performant-bi-and-analytics`
- **Locație:** `EU`
- **Views principale folosite:**
  - `aggregated_historical.extended_campaigns_affiliates_results`
  - `aggregated_historical.stats_shifted_yoy`
  - `users.unique_campaigns_detailed`
  - `finance.commission_states_aggregates`
  - `raw_data.raw_commissions_extended`

---

## 🛠️ Tehnologii Utilizate

- **Backend:** Node.js, Express.js
- **Frontend:** HTML5, Tailwind CSS, Chart.js, Lucide Icons
- **Bază de Date / Analytics:** Google BigQuery SDK
- **Deployment:** Vercel / Render

---

## 🚀 Rulare Locală

```bash
# 1. Clonare proiect
git clone https://github.com/UTILIZATOR/black-friday-2026.git

# 2. Instalare dependențe
npm install

# 3. Pornire server
npm start
```

Deschide în browser: `http://localhost:3000`
