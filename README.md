remove "dev": "nodemon index.json", from scripts of package.json file <br/>
set port=10000 in .env <br/>
create .gitignore add below 2 lines<br/>
node_modules
.env
<br/>

git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/snowden7not/NOTES-Back
git push -u origin main

set respo visibility to public <br/>

GO to render.com -> dashboard -> new ->web service -> paste repositary link in search box -> continue -> <br/>
in build command write below line <br/>
npm install express dotenv mongoose cors jsonwebtoken bcrypt express-fileupload cloudinary <br/>
obviously select free plan in Instance Type section<br/>
IN Environment Variables SECTION ,HEAD TO add from .env <br/>
copy ur .env file here. (remember setting  port=10000  ) <br/>
now click on create web service
