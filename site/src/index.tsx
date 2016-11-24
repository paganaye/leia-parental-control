import * as React from "react";
import * as ReactDOM from "react-dom";
/*
    <script src="./node_modules/react/dist/react.js"></script>
    <script src="./node_modules/react-dom/dist/react-dom.js"></script>
    
    <script src="https://www.gstatic.com/firebasejs/3.6.1/firebase.js"></script>
    <script>
        // Initialize Firebase
        var config = {
            apiKey: "AIzaSyC6iHEeS4kQ0eIZ0cNo7jPWCuGS-3gtAy4",
            authDomain: "leiaparentalcontrol.firebaseapp.com",
            databaseURL: "https://leiaparentalcontrol.firebaseio.com",
            storageBucket: "leiaparentalcontrol.appspot.com",
            messagingSenderId: "737945013874"
        };
        firebase.initializeApp(config);
    </script>
*/
import { Hello } from "./components/Hello";

ReactDOM.render(
    <Hello compiler="TypeScript" framework="React" />,
    document.getElementById("example")
);