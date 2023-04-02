/*
Structure of App-
    1. Login Page -> Connect to MongoDB
    2. Enter Number of Process
    3. Loop through and add files to their respective directories
    3. Drop Downs and Choosing Categories
*/

/*
Updates Pending - 
    (Group 1)
    (Done)1. Front End UI
    2. Login Page
    (Done)3. Thank you page redirecting to login page
    (Group 2)
    (Max Priority Now)
    (Done)(File Names with Sub-Folders have been updated to MongoDB, now you have to retrieve the data)
    (Done)4. View Page showing all the directories - S3.get
    https://stackoverflow.com/questions/33545065/amazon-s3-how-to-get-a-list-of-folders-in-the-bucket
    (Out of Scope)5. Multiple File upload and add required in the input tags -> I don't think multi-file upload is a good idea
    (Done) 6. Changing file names to be inside directories -> Lookup how to put files inside specific directories
    (Maybe add it to a MongoDB database and check if the name is already taken, if so show an error and go 
        back to the same page or add (1) to the page name)
    7. Test App for more bugs
    (Optional) Clean the code and split it into the Clean Code Architecture
    NOTE - To add custom sub-folder, add custom in drop down and if option == custom, change layout in ejs
    (Group 3)
    (Additional Features)
    (Done)8. Clicking on a file shows the file
    9. Editing files, Deleting files 
*/
//Importing NPM Packages - ES5 For
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
//Multer
const multer = require("multer");
//For AWS S3
const AWS = require("aws-sdk");
const { S3Client, PutObjectCommand, GetObjectCommand  } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
//Dotenv
require("dotenv").config();
//Mongoose - MongoDB
const mongoose = require("mongoose");
//Lodash
var _ = require('lodash');
const { urlencoded } = require("body-parser");
const open = require("open");
const app = express();
const port = 3030;

//EJS Engine
app.set("view engine", "ejs");

//Setting public as directory and Body Parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

//Multer Initialization
const storage = multer.memoryStorage(); //Makes sure that the file is always stored in memeory
const upload = multer({ storage: storage }); //and that it isn't stored in disk

//Variables Section
//Flag Variables
let trigger = false;
let type = 0;

//Keeping Track of number of Cycles
let count = 1;
let processCount = 0;
let iter = 0;

//S3 related data from .env file
const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const awsAccessKey = process.env.AWS_ACCESS_KEY;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

//MongoDB Connection
mongoose.connect(process.env.MONGODB_URI);

//Schema
const ChemfilesSchema = new mongoose.Schema({
  subFolder: {
    type: String,
  },
  files: [String],
});
const TechfilesSchema = new mongoose.Schema({
  subFolder: {
    type: String,
  },
  files: [String],
});
const EquipfilesSchema = new mongoose.Schema({
  subFolder: {
    type: String,
  },
  files: [String],
});

const chemFile = mongoose.model("ChemFileSystem", ChemfilesSchema);
const techFile = mongoose.model("TechFileSystem", TechfilesSchema);
const equiFile = mongoose.model("EquipFileSystem", EquipfilesSchema);

//Configuring AWS Access
AWS.config.update({
  accessKeyId: awsAccessKey,
  secretAccessKey: awsSecretAccessKey,
  region: bucketRegion,
});
//Creating a new S3 Object
const s3Obj = new AWS.S3();

const s3 = new S3Client({
  credentials: {
    accessKeyId: awsAccessKey,
    secretAccessKey: awsSecretAccessKey,
  },
  region: bucketRegion,
});

app.get("/", function (req, res) {
  if (trigger) {
    count++;
    iter = 0;
    trigger = false;
    type = 0;
  }
  res.render("processInput");
});

app.post("/", function (req, res) {
  const processCount = req.body.process;
  if (trigger) {
    count++;
    iter = 0;
    trigger = false;
    type = 0;
  }
  res.render("options", { count: count, process: processCount});
});

app.post("/uploads", function (req, res) {
  if (!trigger) {
    chemicalArr = req.body.chemical.split(", ");
    techArr = req.body.technology.split(", ");
    equipArr = req.body.equipment.split(", ");
    count = req.body.count;
    processCount = req.body.process;
    trigger = true;
  } else {
    iter++;
  }
  if (type == 0) {
    res.render("chem", {
      iter: iter,
      chemicalArr: chemicalArr,
    });
  } else if (type == 1) {
    res.render("tech", {
      techArr: techArr,
      iter: iter,
    });
  } else {
    res.render("equip", {
      equipArr: equipArr,
      iter: iter,
      count: count,
      process: processCount,
    });
  }
});

app.get("/views/:directory", function(req, res){
    /*
      Flow of Values => SubFolder.forEach -> 
      Show Sub Folder Value
      Files.forEach -> values.forEach -> file.forEach
      Show files
    */
  let directory = req.params.directory + "/";
  let subFolders = []
  const files = []
  if(directory == "Chemical/"){
    var params = {
      Bucket: bucketName,
      Delimiter: "/",
      Prefix: directory
    };
    //Get the main Sub-Folders and then use that to find the array of files in MongoDB
    s3Obj.listObjects(params, function(err, data){
      if(err){
        throw err
      }else{
        const subfolder = data.CommonPrefixes;
        subfolder.forEach(function(element){
          let subFolderName = element.Prefix.substring(directory.length, element.Prefix.length - 1)
          subFolders.push(subFolderName)
        })        
        async function addArray(files, subFolders) {
          for(const folderName of subFolders) {
            await chemFile.findOne({subFolder: folderName}).then(file => {
              files.push(file.files)
            })
          }
          res.render("View", {subFolders: subFolders, files: files, directoryName: req.params.directory})
        }
        addArray(files, subFolders)
        console.log(files)
        console.log(subFolders)
      }
    })
  }else if(directory == "Technology/"){
    var params = {
      Bucket: bucketName,
      Delimiter: "/",
      Prefix: directory
    };
    //Get the main Sub-Folders and then use that to find the array of files in MongoDB
    s3Obj.listObjects(params, function(err, data){
      if(err){
        throw err
      }else{
        const subfolder = data.CommonPrefixes;
        subfolder.forEach(function(element){
          let subFolderName = element.Prefix.substring(directory.length, element.Prefix.length - 1)
          subFolders.push(subFolderName)
        })        
        async function addArray(files, subFolders) {
          for(const folderName of subFolders) {
            await techFile.findOne({subFolder: folderName}).then(file => {
              files.push(file.files)
            })
          }
          res.render("View", {subFolders: subFolders, files: files, directoryName: req.params.directory})
        }
        addArray(files, subFolders)
        console.log(files)
        console.log(subFolders)
      }
    })
  }else{
    var params = {
      Bucket: bucketName,
      Delimiter: "/",
      Prefix: directory
    };
    //Get the main Sub-Folders and then use that to find the array of files in MongoDB
    s3Obj.listObjects(params, function(err, data){
      if(err){
        throw err
      }else{
        const subfolder = data.CommonPrefixes;
        subfolder.forEach(function(element){
          let subFolderName = element.Prefix.substring(directory.length, element.Prefix.length - 1)
          subFolders.push(subFolderName)
        })        
        async function addArray(files, subFolders) {
          for(const folderName of subFolders) {
            await equiFile.findOne({subFolder: folderName}).then(file => {
              files.push(file.files)
            })
          }
          res.render("View", {subFolders: subFolders, files: files, directoryName: req.params.directory})
        }
        addArray(files, subFolders)
      }
    })
  }
})

app.get("/views/:directory/:subFolder/:file", async(req, res) => {
    const directory = req.params.directory;
    const subFolder = req.params.subFolder;
    const fileName = req.params.file; 
    let dirURL = directory + "/" + subFolder + "/" + fileName
    console.log(dirURL)
    const getObjectParams = {
      Bucket: bucketName,
      Key: dirURL,
    }
    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    open(url, function (err) {
      if(err){
        throw err;
      }  
    });
    res.redirect('/views/' + directory);
})

app.post("/chemUpload", upload.single("chemical"), async (req, res) => {
  //Update Iter inside EJS Files and not in the server side
  //Repeat for other links
  let body = JSON.parse(JSON.stringify(req.body));
  let fileName = body.fileName;
  console.log(body.subDirectory, fileName);
  let subDirectory = ""
  if(body.subDirectory === undefined){
    subDirectory = body.folderName
  }else{
    subDirectory = body.subDirectory;
  }
  let location = "Chemical/" + subDirectory + "/" + fileName;
  //Only Uploads to Database and S3 if the Uploaded file is not empty
  if (req.file != null) {
    //Database Upload
    chemFile.findOneAndUpdate(
      {
        subFolder: subDirectory,
      },
      {
        $addToSet: {
          files: fileName,
        },
      },
      function (err, data) {
        if (err) {
          throw err;
        } else {
          if (data == null || data == undefined) {
            const newFiles = new chemFile({
              subFolder: subDirectory,
              files: [fileName],
            });
            newFiles.save().then(function () {
              console.log("Data Written Successfully");
            });
          }
        }
      }
    );
    
    //S3 Bucket Upload
    let params = {
      Bucket: bucketName,
      Key: location, //req.file.originalname, //Original File name set by the User
      Body: req.file.buffer, //File Contents in Buffer Format
      ContentType: req.file.mimetype, //Tells S3 the File Type
    };
    let command = new PutObjectCommand(params);
    await s3.send(command); //Tells S3 to upload the file we have sent the server from HTML
  }
  res.redirect(307, "/uploads");
});

//

app.post("/techUpload", upload.single("technology"), async (req, res) => {
  if(techArr[0] == '' || techArr.length == 0){
      type = 2;
      iter = -1;
  }else if (type == 0) {
    type = 1;
    iter = -1;
  }
  const body = JSON.parse(JSON.stringify(req.body));
  const fileName = body.fileName;
  let subDirectory = ""
  if(body.subDirectory === undefined){
    subDirectory = body.folderName
  }else{
    subDirectory = body.subDirectory;
  }
  const location = "Technology/" + subDirectory + "/" + fileName;
  if (req.file != null) {
    //Database Upload
    techFile.findOneAndUpdate(
      {
        subFolder: subDirectory,
      },
      {
        $addToSet: {
          files: fileName,
        },
      },
      function (err, data) {
        if (err) {
          throw err;
        } else {
          if (data == null || data == undefined) {
            const newFiles = new techFile({
              subFolder: subDirectory,
              files: [fileName],
            });
            newFiles.save().then(function () {
              console.log("Data Written Successfully");
            });
          }
        }
      }
    );
    //S3 Bucket Upload
    const params = {
      Bucket: bucketName,
      Key: location, //req.file.originalname, //Original File name set by the User
      Body: req.file.buffer, //File Contents in Buffer Format
      ContentType: req.file.mimetype, //Tells S3 the File Type
    };
    const command = new PutObjectCommand(params);
    await s3.send(command); //Tells S3 to upload the file we have sent the server from HTML
  }
  res.redirect(307, "/uploads");
});

app.post("/equipUpload", upload.single("equipment"), async (req, res) => {
  if (type == 1) {
    type = 2;
    iter = -1;
  }
  const body = JSON.parse(JSON.stringify(req.body));
  const fileName = body.fileName;
  let subDirectory = ""
  if(body.subDirectory === undefined){
    subDirectory = body.folderName
  }else{
    subDirectory = body.subDirectory;
  }
  const location = "Equipment/" + subDirectory + "/" + fileName;
  if (req.file != null) {

    //Database Upload
    equiFile.findOneAndUpdate(
      {
        subFolder: subDirectory,
      },
      {
        $addToSet: {
          files: fileName,
        },
      },
      function (err, data) {
        if (err) {
          throw err;
        } else {
          if (data == null || data == undefined) {
            const newFiles = new equiFile({
              subFolder: subDirectory,
              files: [fileName],
            });
            newFiles.save().then(function () {
              console.log("Data Written Successfully");
            });
          }
        }
      }
    );

    //S3 Bucket Upload
    const params = {
      Bucket: bucketName,
      Key: location, //req.file.originalname, //Original File name set by the User
      Body: req.file.buffer, //File Contents in Buffer Format
      ContentType: req.file.mimetype, //Tells S3 the File Type
    };
    const command = new PutObjectCommand(params);
    await s3.send(command); //Tells S3 to upload the file we have sent the server from HTML
  }
  res.redirect(307, "/uploads");
});

app.listen(port, function () {
  console.log("Server Started Successfully");
});
