const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/AISA').then(async () => {
    console.log("Connected to DB AISA.");

    const planSchema = new mongoose.Schema({
        planName: String,
        priceMonthly: Number,
        priceYearly: Number,
        priceYearlyPerMonth: Number,
        credits: Number,
        creditsYearly: Number,
    }, { strict: false });

    const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

    const plans = await Plan.find();
    for (let plan of plans) {
        if (plan.priceMonthly > 0) {
            // APPLY 30% DISCOUNT TO ALL PAID PLANS (including Founder)
            const monthlyDiscounted = Math.ceil(plan.priceMonthly * 0.7);

            // Special fix: If Founder (699) and Pro (999) both end up at similar yearly prices, 
            // ensure Founder stays slightly cheaper or distinct.
            // Pro (999 * 0.7 = 700)
            // Founder (699 * 0.7 = 490)

            plan.priceYearlyPerMonth = monthlyDiscounted;
            plan.priceYearly = monthlyDiscounted * 12;

            // Credits follow the 12x rule for all except Free
            plan.creditsYearly = plan.credits * 12;

        } else {
            plan.priceYearly = 0;
            plan.priceYearlyPerMonth = 0;
            plan.creditsYearly = plan.credits;
        }
        await plan.save();
        console.log(`${plan.planName} → priceMonthly: ₹${plan.priceMonthly}, priceYearlyPerMonth: ₹${plan.priceYearlyPerMonth}, priceYearly: ₹${plan.priceYearly}, creditsYearly: ${plan.creditsYearly}`);
    }

    console.log("\nDone! All plans (including Founder) now have a 30% Yearly discount in DB.");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
