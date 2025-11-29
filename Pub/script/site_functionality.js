// const starInput = document.getElementById("starInput"); //The file upload
// const instructionTitle = document.getElementById("instructionTitle"); 
const buttons = document.querySelectorAll('button');
const filename = document.getElementById('fileName');
const userEditContainer = document.getElementById('userEditBtn-container');
const processIMGLabel = document.getElementById('processIMGLabel');

let finalStage = false;

starInput.addEventListener("change", function(e) {
  instructionTitle.innerText = 'Dra ut en form för att skära bilden tills du får endast stjärnan';
  filename.innerText = e.target.files[0].name;
  untoggle(userEditContainer);
  finalStage = true;
});

function displayFinalInstructions(){
  if(finalStage){
    instructionTitle.innerText = 'När du har endast stjärnan, klicka på "Räkna avstånd" för att få estimationen';
    untoggle(processIMGLabel)
  }
}

buttons.forEach(button => {
  button.addEventListener('click', (e) => {
    e.preventDefault();
  })
})

function untoggle(item){
  item.classList.remove('toggle');
}

function toggle(item){
  item.classList.add('toggle');
}