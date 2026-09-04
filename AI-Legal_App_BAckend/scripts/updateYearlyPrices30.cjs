const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Make sure to load env if needed

// We connect manually
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aisa').then(async () => {
    console.log("Connected to DB to update pricing.");

    const planSchema = new mongoose.Schema({
        planName: String,
        priceMonthly: Number,
        priceYearly: Number,
    }, { strict: false });

    const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

    const plans = await Plan.find();
    for (let plan of plans) {
        if (plan.priceMonthly > 0) {
            // EXACT 30% off the monthly price
            const exact30Off = plan.priceMonthly * 0.7;
            plan.priceYearly = Math.round(exact30Off);
            // Some rounding logic mapping if you want attractive numbers (like 349)
            // 499 * 0.7 = 349.3 -> 349
            // 699 * 0.7 = 489.3 -> 489
            // 999 * 0.7 = 699.3 -> 699
            // 2499 * 0.7 = 1749.3 -> 1749

            await plan.save();
            console.log(`Updated ${plan.planName} - Monthly: ${plan.priceMonthly}, New Yearly: ${plan.priceYearly}`);
        } else {
            plan.priceYearly = 0;
            await plan.save();
        }
    }

    console.log("Pricing updated to exactly 30% off.");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
