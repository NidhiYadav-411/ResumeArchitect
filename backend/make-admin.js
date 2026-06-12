const { sequelize } = require('./src/config/database');
const User = require('./src/models/User');

const makeAdmin = async () => {
    try {
        await sequelize.authenticate();
        // Just make the first user an admin, or the specific email.
        const user = await User.findOne();
        if (user) {
            user.role = 'admin';
            await user.save();
            console.log(`Successfully elevated ${user.name} (${user.email}) to ADMIN!`);
        } else {
            console.log("No users found to make admin. Please register first.");
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

makeAdmin();
