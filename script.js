// function openPage(evt, pageName) {
//     console.log("openPage called");
//     // Get all tab content elements and hide them
//     var tabcontent = document.getElementsByClassName("app-screens");
//     console.log(tabcontent);
//     for (var i = 0; i < tabcontent.length; i++) {
//         tabcontent[i].style.display = "none";
//     }

//     console.log(tabcontent);

//     // Get all tab buttons and remove "active" class
//     var tabbuttons = document.getElementsByClassName("nav-icon");
//     for (var i = 0; i < tabbuttons.length; i++) {
//         if (tabbuttons[i].classList.contains("active")) {
//             tabbuttons[i].classList.remove("active");
//         }

//     }

//     // Show the clicked tab's content
//     console.log(evt);
//     console.log(pageName);
//     console.log(evt.currentTarget);

//     document.getElementById(pageName).style.display = "block";

//     // Add "active" class to the clicked button
//     evt.currentTarget.classList.add("active");
// }