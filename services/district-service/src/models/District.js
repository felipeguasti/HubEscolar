const { DataTypes } = require("sequelize");
const sequelize = require('../../../../src/config/db');

const District = sequelize.define("District", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: "districts",
    timestamps: false
});

District.associate = (models) => {
    District.hasMany(models.User, { foreignKey: 'districtId' });
};

module.exports = District;
