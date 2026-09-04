# AISA Credit System & Pricing Strategy

This document outlines the architecture and financial modeling of the AISA Credit system, designed to ensure a **50% Profit Margin** above Google Vertex AI's infrastructure costs.

## 💰 Financial Model

| Metadata | Rate |
| :--- | :--- |
| **Credit Unit Value** | 1,000 Credits = ₹100 (~$1.20) |
| **Individual Credit Cost** | ₹0.1 (~$0.0012 USD) |
| **Profit Strategy** | **2x Markup** (Price = Cost * 2) |

---

## 🛠 Feature Cost Breakdown (Profit-Optimized)

Based on [Vertex AI Generative AI Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing).

### 1. Vision (Images & Video)
| Feature | Vertex AI Cost (USD) | Target Price (2x) | **Credits Deduction** |
| :--- | :--- | :--- | :--- |
| **AISA Image (Imagen 3)** | $0.040 / image | $0.080 | **66 Credits** |
| **AISA HD Image** | $0.060 (Est) | $0.120 | **100 Credits** |
| **Veo Fast (1080p)** | $0.150 / sec | $0.300 | **250 Credits / sec** |
| **Veo Fast (4k)** | $0.350 / sec | $0.700 | **585 Credits / sec** |
| **Veo Pro (1080p)** | $0.200 (Est) | $0.400 | **333 Credits / sec** |
| **Veo Pro (4k)** | $0.400 / sec | $0.800 | **666 Credits / sec** |

### 2. Intelligent Search (Grounding)
| Feature | Vertex AI Cost (USD) | Target Price (2x) | **Credits Deduction** |
| :--- | :--- | :--- | :--- |
| **Grounding with Google Search** | $0.035 / query | $0.070 | **60 Credits** |
| **AISA Deep Search** | Multi-step queries | $0.100 | **85 Credits** |

### 3. Model Interactions (Tokens)
Modeling based on average interaction length (800 input + 200 output tokens = 1,000 tokens total).

| Model Tier | Cost per avg interaction | Target Price (2x) | **Credits Deduction** |
| :--- | :--- | :--- | :--- |
| **Gemini 3.1 Flash Preview** | $0.0010 | $0.0020 | **2 Credits / Chat** |
| **Gemini 3.1 Pro Preview** | $0.0040 | $0.0080 | **7 Credits / Chat** |

---

## 🚀 Plan Architecture

### 🛡️ Founder Plan (Legacy)
- **Credits**: 20,000 Lifetime / Month
- **Perks**: Access to specialized Video models and Early Beta features.
- **Profitability**: High engagement retention for early investors.

### 🌟 Pro Plan
- **Credits**: 10,000 / Month
- **Monthly Revenue**: ~$12.00 (₹999)
- **Max Cost (at 100% usage)**: ~$6.00
- **Net Margin**: ~$6.00 (50% Profit)

---

## ⚙️ Configuration & Management

The system costs are **not hardcoded**. They are managed via the **Admin Dashboard > Settings** tab, which interacts with the `SystemConfig` model in the database.

**Backend Path:** `AISA-Backend/services/subscriptionService.js`
**Frontend Path:** `AISA/src/pages/AdminDashboard.jsx`

To refresh costs system-wide, update the `FEATURE_COSTS` JSON in the Admin interface.

---
*Last Updated: March 2026*
