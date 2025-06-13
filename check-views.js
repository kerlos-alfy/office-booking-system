// check-views.js

const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'src', 'views');
const partialsDir = path.join(viewsDir, 'partials');

const requiredPartials = ['header.ejs', 'footer.ejs'];

console.log('✅ Checking required partials...');

requiredPartials.forEach(file => {
    const filePath = path.join(partialsDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ Found: partials/${file}`);
    } else {
        console.error(`❌ Missing: partials/${file}`);
    }
});

console.log('\n✅ Checking all views...');

const walkDir = (dir, fileList = []) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            fileList = walkDir(filePath, fileList);
        } else {
            if (file.endsWith('.ejs')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
};

const viewFiles = walkDir(viewsDir);

viewFiles.forEach(viewFile => {
    const content = fs.readFileSync(viewFile, 'utf-8');
    const includes = content.match(/<%- include\(['"`](.*?)['"`]\) %>/g);

    if (includes) {
        includes.forEach(includeStatement => {
            const match = includeStatement.match(/<%- include\(['"`](.*?)['"`]\) %>/);
            if (match && match[1]) {
                const includePath = match[1];
                let includeFullPath;

                if (includePath.startsWith('partials/')) {
                    includeFullPath = path.join(viewsDir, includePath + '.ejs');
                } else if (includePath.startsWith('../partials/')) {
                    includeFullPath = path.join(viewsDir, 'partials', path.basename(includePath) + '.ejs');
                } else {
                    includeFullPath = path.join(viewsDir, includePath + '.ejs');
                }

                if (!fs.existsSync(includeFullPath)) {
                    console.error(`❌ Missing include in ${viewFile}: ${includePath}`);
                } else {
                    console.log(`✅ OK include in ${path.relative(__dirname, viewFile)} → ${includePath}`);
                }
            }
        });
    }
});

console.log('\n🎉 Final check complete!');
