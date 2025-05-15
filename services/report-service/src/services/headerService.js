const Header = require('../models/Header');
const axios = require('axios');
const { cache } = require('../config/cache');
const logger = require('../services/loggingService');

const SCHOOL_SERVICE_URL = process.env.SCHOOL_SERVICE_URL;
const DISTRICT_SERVICE_URL = process.env.DISTRICT_SERVICE_URL;
const CACHE_TTL = 24 * 60 * 60; // 24 horas em segundos

class HeaderService {
    async getOrCreateHeader(schoolId, authToken) {
        logger.info(`Iniciando getOrCreateHeader para schoolId: ${schoolId}`);

        let header = await this.getFromCache(schoolId);
        if (header) {
            logger.info('Header encontrado no cache');
            return header;
        }

        header = await Header.findOne({ where: { schoolId } });
        
        if (!header) {
            logger.info('Header não encontrado no banco, criando novo...');
            header = await this.createNewHeader(schoolId, authToken);
        } else if (this.needsUpdate(header.lastCacheUpdate)) {
            logger.info('Header precisa ser atualizado');
            await this.updateHeaderCache(header, authToken);
        }

        logger.info('Header antes de cache:', {
            schoolId: header?.schoolId,
            hasLine1: !!header?.line1,
            hasLine2: !!header?.line2
        });

        await this.setCache(schoolId, header);
        return header;
    }

    async createNewHeader(schoolId, authToken) {
        console.log('=== START createNewHeader ===');
        console.log('SchoolId recebido:', schoolId);
        
        try {
            const schoolData = await this.fetchSchoolData(schoolId, authToken);
            console.log('Dados da escola:', schoolData);

            const districtData = await this.fetchDistrictData(schoolData.districtId, authToken);
            console.log('Dados do distrito:', districtData);

            const formattedAddress = this.formatAddress(schoolData);
            console.log('Endereço formatado:', formattedAddress);

            // Debug point antes de criar o header
            const headerData = {
                schoolId: schoolId,
                districtId: schoolData.districtId,
                cachedSchoolName: schoolData.name,
                cachedDistrictName: districtData.name,
                cachedState: districtData.state,
                cachedAddress: formattedAddress,
                line1: line1,
                line2: line2,
                lastCacheUpdate: new Date()
            };
            console.log('Dados do header antes de criar:', headerData);

            const createdHeader = await Header.create(headerData);
            console.log('Header criado:', createdHeader.toJSON());
            console.log('=== END createNewHeader ===');
            
            return createdHeader;
        } catch (error) {
            console.log('=== ERROR in createNewHeader ===');
            console.log('Erro:', error.message);
            throw error;
        }
    }

    formatAddress(schoolData) {
        const parts = [
            schoolData.address,
            schoolData.city,
            schoolData.state,
            schoolData.cep
        ].filter(Boolean);

        let address = parts.join(' - ');
        if (schoolData.telephone) {
            address += ` - Tel: ${schoolData.telephone}`;
        }
        return address;
    }

    // Cache methods
    async getFromCache(schoolId) {
        return cache.get(`header:${schoolId}`);
    }

    async setCache(schoolId, header) {
        return cache.set(`header:${schoolId}`, header, CACHE_TTL);
    }

    needsUpdate(lastUpdate) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return lastUpdate < oneDayAgo;
    }

    async updateHeaderCache(header, authToken) {
        try {
            const schoolData = await this.fetchSchoolData(header.schoolId, authToken);
            const districtData = await this.fetchDistrictData(schoolData.districtId, authToken);
            const formattedAddress = this.formatAddress(schoolData);

            // Only update cached data and address, preserve custom lines if set
            await header.update({
                cachedSchoolName: schoolData.name,
                cachedDistrictName: districtData.name,
                cachedState: districtData.state,
                cachedAddress: formattedAddress,
                line1: header.line1,
                line2: header.line2,
                lastCacheUpdate: new Date()
            });

            return header;
        } catch (error) {
            logger.error(`Error updating header cache for school ${header.schoolId}:`, error);
            throw error;
        }
    }

    // Update header with new data
    async updateHeader(headerData) {
        try {
            logger.info('Updating header with data:', headerData);

            const header = await Header.findOne({ 
                where: { schoolId: headerData.schoolId } 
            });

            if (header) {
                // Start with existing data
                const updatedData = {
                    schoolLogo: header.schoolLogo,
                    districtLogo: header.districtLogo,
                    line1: header.line1,
                    line2: header.line2,
                    cachedSchoolName: header.cachedSchoolName,
                    cachedDistrictName: header.cachedDistrictName,
                    cachedState: header.cachedState,
                    cachedAddress: header.cachedAddress
                };

                // Update only provided fields
                if (headerData.schoolLogo) updatedData.schoolLogo = headerData.schoolLogo;
                if (headerData.districtLogo) updatedData.districtLogo = headerData.districtLogo;
                if (headerData.line1 !== undefined) updatedData.line1 = headerData.line1;
                if (headerData.line2 !== undefined) updatedData.line2 = headerData.line2;

                // Always update timestamp
                updatedData.lastCacheUpdate = new Date();

                logger.info('Updating header with:', updatedData);

                await header.update(updatedData);
                return header;
            }

            // If header doesn't exist, create new one
            return await Header.create({
                ...headerData,
                lastCacheUpdate: new Date()
            });
        } catch (error) {
            logger.error(`Error updating header for school ${headerData.schoolId}:`, error);
            throw error;
        }
    }

    // Delete header
    async deleteHeader(schoolId) {
        try {
            const header = await Header.findOne({ where: { schoolId } });
            if (!header) {
                throw new Error('Header not found');
            }

            await header.destroy();
            await cache.del(`header:${schoolId}`);
            return true;
        } catch (error) {
            logger.error(`Error deleting header for school ${schoolId}:`, error);
            throw error;
        }
    }

    // List all headers
    async listHeaders() {
        try {
            return await Header.findAll();
        } catch (error) {
            logger.error('Error listing headers:', error);
            throw error;
        }
    }

    // External service calls
    async fetchSchoolData(schoolId, authToken) {
        try {
            const response = await axios.get(
                `${SCHOOL_SERVICE_URL}/schools/${schoolId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            return response.data;
        } catch (error) {
            logger.error(`Error fetching school data for ID ${schoolId}:`, error);
            throw error;
        }
    }

    async fetchDistrictData(districtId, authToken) {
        try {
            const response = await axios.get(
                `${DISTRICT_SERVICE_URL}/districts/${districtId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            return response.data;
        } catch (error) {
            logger.error(`Error fetching district data for ID ${districtId}:`, error);
            throw error;
        }
    }
}

module.exports = new HeaderService();