const { program } = require('commander');
const sequelize = require('../config/db');
const Report = require('../models/Report');

program
    .version('1.0.0')
    .description('Report Service CLI');

program
    .command('db:migrate')
    .description('Run database migrations')
    .action(async () => {
        try {
            await sequelize.authenticate();
            console.log('Database connection successful');
            await sequelize.sync({ alter: true });
            console.log('Database migrated successfully');
            process.exit(0);
        } catch (error) {
            console.error('Migration failed:', error);
            process.exit(1);
        }
    });

program
    .command('db:status')
    .description('Check database connection and tables')
    .action(async () => {
        try {
            await sequelize.authenticate();
            console.log('Database connection: OK');
            
            const tables = await sequelize.showAllSchemas();
            console.log('\nDatabase tables:');
            console.log(tables);
            
            process.exit(0);
        } catch (error) {
            console.error('Database check failed:', error);
            process.exit(1);
        }
    });

program
    .command('db:reset')
    .description('Reset database (WARNING: Deletes all data)')
    .option('-f, --force', 'Force reset without confirmation')
    .action(async (options) => {
        try {
            if (!options.force) {
                console.log('WARNING: This will delete all data. Use --force to confirm.');
                process.exit(0);
            }
            
            await sequelize.sync({ force: true });
            console.log('Database reset successfully');
            process.exit(0);
        } catch (error) {
            console.error('Database reset failed:', error);
            process.exit(1);
        }
    });

program
    .command('db:migrate:reports')
    .description('Update reports table structure')
    .action(async () => {
        try {
            await sequelize.authenticate();
            console.log('Database connection successful');
            
            // Altera apenas a tabela reports
            await Report.sync({ alter: true });
            console.log('Reports table updated successfully');
            process.exit(0);
        } catch (error) {
            console.error('Reports table update failed:', error);
            process.exit(1);
        }
    });

program
    .command('db:status:reports')
    .description('Check reports table structure')
    .action(async () => {
        try {
            await sequelize.authenticate();
            console.log('Database connection: OK');
            
            const tableInfo = await sequelize.query(
                'DESCRIBE reports',
                { type: sequelize.QueryTypes.DESCRIBE }
            );
            console.log('\nReports table structure:');
            console.log(tableInfo);
            
            process.exit(0);
        } catch (error) {
            console.error('Reports table check failed:', error);
            process.exit(1);
        }
    });
    
program
    .command('db:seed')
    .description('Populate database with sample reports')
    .action(async () => {
        try {
            await sequelize.authenticate();
            console.log('Database connection successful');

            const sampleReports = [
                {
                    studentId: 1,
                    studentClass: '9º Ano A',
                    createdById: 2,
                    createdByRole: 'Professor',
                    content: 'Aluno apresentou comportamento inadequado durante a aula de matemática.',
                    reportLevel: 'moderate',
                    disciplinaryActIndex: 3,
                    reportObservation: 'Conversas excessivas e uso de celular',
                    reportRecommendation: 'Sugere-se conversa com os responsáveis',
                    suspended: false,
                    callParents: true,
                    parentsMeeting: new Date('2025-04-25 14:00:00'),
                    status: 'pending'
                },
                {
                    studentId: 2,
                    studentClass: '8º Ano B',
                    createdById: 3,
                    createdByRole: 'Coordenador',
                    content: 'Aluno envolvido em conflito durante o intervalo.',
                    reportLevel: 'serious',
                    disciplinaryActIndex: 5,
                    suspended: true,
                    suspensionDuration: 2,
                    callParents: true,
                    status: 'delivered',
                    deliveredAt: new Date('2025-04-22 10:30:00'),
                    deliveredBy: 3,
                    deliveryMethod: 'whatsapp',
                    deliveryConfirmation: '+5527999999999'
                },
                {
                    studentId: 3,
                    studentClass: '7º Ano C',
                    createdById: 4,
                    createdByRole: 'Professor',
                    content: 'Não realizou as atividades propostas em sala.',
                    reportLevel: 'light',
                    disciplinaryActIndex: 1,
                    reportRecommendation: 'Acompanhamento pedagógico recomendado',
                    status: 'archived',
                    deliveredAt: new Date('2025-04-20 15:45:00'),
                    deliveredBy: 4,
                    deliveryMethod: 'print',
                    parentResponse: 'Ciente. Conversaremos com o aluno em casa.'
                }
            ];

            await Report.bulkCreate(sampleReports);
            console.log('Sample reports created successfully');
            process.exit(0);
        } catch (error) {
            console.error('Seeding failed:', error);
            process.exit(1);
        }
    });
    
program.parse(process.argv);