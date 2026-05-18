const fs = require('fs');
const path = require('path');

const routeRoles = {
    'users': "['admin']",
    'studios': "['admin', 'pricing']",
    'settings': "['admin']",
    'sales': "['admin', 'sales', 'finance']",
    'popular': "['admin', 'sales', 'pricing', 'orcamento']",
    'kanban': "['admin', 'sales', 'production']",
    'figures': "['admin', 'pricing', 'orcamento']",
    'dashboard': "['admin', 'sales', 'pricing', 'finance', 'orcamento', 'production', 'painter']",
    'customers': "['admin', 'sales', 'finance']",
    'coupons': "['admin', 'sales']",
    'commissions': "['admin', 'finance', 'sales']",
    'catalog': "['admin', 'pricing', 'orcamento']",
    'catalog-prices': "['admin', 'pricing', 'orcamento']",
    'shipping': "['admin', 'sales', 'finance']",
    'debug': "['admin']"
};

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file === 'route.ts') {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });
    return arrayOfFiles;
}

const apiAdminPath = path.join(__dirname, '..', 'app', 'api', 'admin');
const files = getAllFiles(apiAdminPath, []);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Ignore files already protected or deactivated
    if (content.includes('requireRoles(') || content.includes('Sistema de inventário desativado')) return;

    // Remove legacy checkAuth function block from users/route.ts and figures/route.ts
    content = content.replace(/const checkAuth = async \(\).*?};/gs, '');
    
    // Also remove any calls to checkAuth()
    content = content.replace(/const session = await checkAuth\(\);[\s\S]*?(?=if \(|const|let|return)/g, '');
    
    // Find base route name to determine roles
    const relPath = file.replace(apiAdminPath, '').replace(/\\/g, '/'); // e.g. /users/route.ts or /coupons/[id]/route.ts
    const baseFolder = relPath.split('/')[1]; 
    const rolesArrStr = routeRoles[baseFolder] || "['admin']";
    
    // Import statement
    if (!content.includes('requireRoles')) {
        // Insert after first import
        content = content.replace(/(import.*?;)/, `$1\nimport { requireRoles } from '@/lib/server-auth';`);
    }

    if (!content.includes('NextResponse')) {
        content = content.replace(/(import.*?;)/, `$1\nimport { NextResponse } from 'next/server';`);
    }

    const regex = /(export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\([^\)]*\)\s*\{\s*)(try\s*\{)?/g;
    
    content = content.replace(regex, (match, p1, p2, p3) => {
        const injected = `\n    const sessionOrResponse = await requireRoles(${rolesArrStr});\n    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;\n`;
        if (p3) {
            // there is a try {
            return p1 + p3 + injected;
        } else {
            return p1 + injected;
        }
    });

    fs.writeFileSync(file, content, 'utf8');
    console.log('Protected:', relPath, 'with roles:', rolesArrStr);
});
