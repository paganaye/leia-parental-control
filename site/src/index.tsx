import * as React from "react";
import * as ReactDOM from "react-dom";

import { Hello } from "./components/Hello";
import { LoginBox } from "./components/LoginBox";
ReactDOM.render(
    <div>
        <LoginBox />
        <Hello compiler="TypeScript" framework="React" />
    </div>,
    document.getElementById("example")
);

