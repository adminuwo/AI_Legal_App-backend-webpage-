const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/AISA').then(async () => {
    console.log("Connected to DB AISA to update creditsYearly.");

    const planSchema = new mongoose.Schema({
        planName: String,
        credits: Number,
        creditsYearly: Number,
    }, { strict: false });

    const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

    const plans = await Plan.find();
    for (let plan of plans) {
        if (plan.planName.toLowerCase().includes('founder') || plan.planName.toLowerCase().includes('free')) {
            // Free stays 500 maybe? Let's assume free tier doesn't multiply
            plan.creditsYearly = plan.credits;
        } else {
            // Other paid plans (Starter, Pro, Business) get 12x credits per year
            plan.creditsYearly = plan.credits * 12;
        }
        await plan.save();
        console.log(`Updated ${plan.planName} - Monthly Credits: ${plan.credits}, Yearly Credits: ${plan.creditsYearly}`);
    }

    console.log("Database updated successfully.");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
