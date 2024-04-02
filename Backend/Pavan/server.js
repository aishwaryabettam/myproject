const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const excel = require('exceljs');
const fs = require('fs');

mongoose.connect('mongodb://127.0.0.1:27017/monosageCarrer', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB', err);
});

const taskSchema = new mongoose.Schema({
  fullName: String,
  Email: String,
  Mobile: Number,
  Gender: String,
  Degree: String,
  University: String,
  PassedOutYear: Number,
  CurrentCompany: String,
  CurrentSalary: String,
  ExpectedSalary: String,
  CV: String,


     
  path: String,
  pathTwo: String,
  pathThree: String,
  pathFour: String,
  pathFive: String,




  date: { type: Date, default: Date.now },
});

const Task = mongoose.model('todos', taskSchema);

const app = express();
const PORT = 3001;

app.use(bodyParser.json());
app.use(cors());
app.use('/uploads', express.static(__dirname + '/uploads'));

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const username = req.body.fullName; // Assuming fullName is unique enough for file naming
    cb(null, username + '-' + Date.now() + ext);
  }
});

const upload = multer({ storage: storage })


// API for saving applicant data  **
app.post('/upload', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'file2', maxCount: 1 },{ name: 'file3', maxCount: 1 },{ name: 'file4', maxCount: 1 },{ name: 'file5', maxCount: 1 }]), (req, res) => {
  const { fullName, Email, Mobile, Gender, Degree, University, PassedOutYear, CurrentCompany, CurrentSalary, ExpectedSalary, CV } = req.body;
  //const filePath1 = req.file.path; // Assuming the file path is correctly stored by multer
  const file1Path = req.files['file'] ? req.files['file'][0].path : null;
  const file2Path = req.files['file2'] ? req.files['file2'][0].path : null;
  const file3Path = req.files['file3'] ? req.files['file'][0].path : null;
  const file4Path = req.files['file4'] ? req.files['file'][0].path : null;
  const file5Path = req.files['file5'] ? req.files['file'][0].path : null;

  console.log(file1Path, file2Path)
  const task = new Task({
    fullName,
    Email,
    Mobile,
    Gender,
    Degree,
    University,
    PassedOutYear,
    CurrentCompany,
    CurrentSalary,
    ExpectedSalary,
    CV,
    path: file1Path, // Store the file path in the database
    pathTwo: file2Path,
    pathThree: file3Path,
    pathFour: file4Path,
    pathFive: file5Path

  });

  task.save()
    .then(savedTask => {
      console.log("Data saved successfully:", savedTask);
      res.sendStatus(200);
    })
    .catch(error => {
      console.error("Error saving data:", error);
      res.status(500).send('Error saving data');
    });
});







// API to get applicants data without filtering and using pagination **
app.get('/applicants', async (req, res) => {
  try {
      let filter = {};
      let { search, date, page, limit } = req.query;
      page = parseInt(page) || 1;
      limit = parseInt(limit) || 6; // Default limit to 10 if not provided
      const skip = (page - 1) * limit;

      // Extract query parameters from the request
      console.log(search, date);

      // If search query is provided, construct the filter
      if (search) {
          // Check if the search query is a number (mobile number)
          const containsOnlyDigits = /^\d+$/.test(search);
          if (containsOnlyDigits) {
              // If it's a number, convert it to a number and search by Mobile
              filter.Mobile = parseInt(search);
          } else {
              // If it's not a number, search by name or email (case-insensitive regex)
              filter.$or = [
                  { fullName: { $regex: search, $options: 'i' } }, // Case-insensitive regex search for fullName
                  { Email: { $regex: search, $options: 'i' } } // Case-insensitive regex search for Email
              ];
          }
      }

      // If date query parameter is provided, add date filtering to the filter
      if (date) {
          const startDate = new Date(date); // Convert date string to Date object
          const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Set endDate to the next day
          filter.date = {
              $gte: startDate,
              $lt: endDate
          };
      }

      // Fetch applicants based on the filter criteria with pagination
      const applicants = await Task.find(filter).skip(skip).limit(limit);
      if(applicants.length === 0){
        res.send("NO Data Avilability")
        return
      }
      res.json(applicants);
  } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
  }
});







// API to get specific user info **
app.get("/applicants/byid/:id", async (req, res) => {
  const { id } = req.params
  console.log(id)
  try {
    const user = await Task.findById(id)
    if (!user) {
      return res.status(404).send("User Not Found")
    }
    res.json(user)
  } catch (err) {
    console.log("Error Fetching User")
    res.status(500).send("internal server Error")
  }
})






// API  which is used to download all users data from DB into xlx format **
app.get('/download/users', async (req, res) => {

  try {
    // Fetch all users from the database
    const users = await Task.find({});
    
    // Create a new Excel workbook
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Users');
    
    // Define columns in the worksheet
    worksheet.columns = [
      { header: 'Serial Number', key: 'serialNumber', width: 10 },
      { header: 'Full Name', key: 'fullName', width: 30 },
      { header: 'Email', key: 'Email', width: 30 },
      { header: 'Mobile', key: 'Mobile', width: 15 },
      { header: 'Gender', key: 'Gender', width: 10 },
      { header: 'Degree', key: 'Degree', width: 20 },
      { header: 'University', key: 'University', width: 30 },
      { header: 'Passed Out Year', key: 'PassedOutYear', width: 20 },
      { header: 'Current Company', key: 'CurrentCompany', width: 30 },
      { header: 'Current Salary', key: 'CurrentSalary', width: 20 },
      { header: 'Expected Salary', key: 'ExpectedSalary', width: 20 },
      { header: 'CV', key: 'CV', width: 30 },
    ];

    // Add rows to the worksheet
    let counter = 1;
    users.forEach(user => {
      worksheet.addRow({
        serialNumber: counter++,
        fullName: user.fullName,
        Email: user.Email,
        Mobile: user.Mobile,
        Gender: user.Gender,
        Degree: user.Degree,
        University: user.University,
        PassedOutYear: user.PassedOutYear,
        CurrentCompany: user.CurrentCompany,
        CurrentSalary: user.CurrentSalary,
        ExpectedSalary: user.ExpectedSalary,
        CV: user.CV
      });
    });

    // Generate a unique file name for the Excel sheet
    const fileName = `users_${Date.now()}.xlsx`;
    const filePath = fileName


    // Save the workbook to a file
    await workbook.xlsx.writeFile(filePath);

    // Stream the file to the response
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Cleanup: Delete the temporary file after streaming
    fileStream.on('end', () => {
      fs.unlinkSync(filePath);
    });

     

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});