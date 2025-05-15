const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Header = sequelize.define('Header', {
    schoolId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    districtId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    schoolLogo: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Path to school logo image'
    },
    districtLogo: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Path to district logo image'
    },
    line1: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'First line of header (e.g. Custom text)'
    },
    line2: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Second line of header (e.g. Custom text)'
    },
    cachedSchoolName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cachedDistrictName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cachedState: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cachedAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Full formatted address including phone'
    },
    lastCacheUpdate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'headers',
    timestamps: true
});

module.exports = Header;