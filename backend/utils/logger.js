const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../logs/system-logs.log');

const writeLog = (action, user) => {
    const newLog = {
        id: Date.now(),
        action,
        user,
        date: new Date().toISOString()
    };
    
    // Append to file, each line is a JSON string
    fs.appendFileSync(LOG_FILE, JSON.stringify(newLog) + '\n', 'utf8');
};

const getLogs = () => {
    if (!fs.existsSync(LOG_FILE)) {
        return [];
    }
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = data.split('\n').filter(line => line.trim() !== '');
    const logs = lines.map(line => {
        try {
            return JSON.parse(line);
        } catch (e) {
            return null;
        }
    }).filter(log => log !== null);
    
    // Đảo ngược để Log mới nhất đưa lên đầu
    return logs.reverse();
};

module.exports = { writeLog, getLogs };
