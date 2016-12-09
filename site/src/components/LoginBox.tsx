import * as React from "react";

export interface LoginProps { }

export class LoginBox extends React.Component<LoginProps, {}> {
    database: firebase.Database;
    firebase: firebase.FirebaseApplication;

    constructor(props: any) {
        super(props)
        this.firebase = (window as any).firebase
        this.database = this.firebase.database();

    }

    register(e: React.MouseEvent<HTMLInputElement>): void {
        var email = "";
        var password = "";
        this.firebase.auth().createUserWithEmailAndPassword(email, password).catch((error: any) => {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            // ...
        });
    }

    mailSignIn(e: React.MouseEvent<HTMLInputElement>): void {
        var email = "";
        var password = "";
        this.firebase.auth().signInWithEmailAndPassword(email, password).catch((error: any) => {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            // ...
        });
    }
    googleSignIn(e: React.MouseEvent<HTMLInputElement>): void {
        var provider = new this.firebase.auth.GoogleAuthProvider();
        this.finishLogin(provider);
    }

    facebookSignIn(e: React.MouseEvent<HTMLInputElement>): void {
        var provider = new this.firebase.auth.FacebookAuthProvider();
        this.finishLogin(provider);
    }

    finishLogin(provider: any) {
        this.firebase.auth().signInWithPopup(provider).then((result: any) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            var token = result.credential.accessToken;
            // The signed-in user info.
            var user = result.user;
            alert("token:" + token + " user:" + user);
            // ...
        }).catch((error: any) => {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            // The email of the user's account used.
            var email = error.email;
            // The firebase.auth.AuthCredential type that was used.
            var credential = error.credential;
            // ...
            alert(JSON.stringify(error));
        });
    }

    logout() {
        this.firebase.auth().signOut().then(() => {
            // Sign-out successful.
            alert("signed out")
        }, (error: any) => {
            alert("error " + error)
        });
    }

    render() {
        return <div>
            <input type="text" placeholder="login" />
            <input type="password" placeholder="password" />
            <input type="button" value="login" onClick={e => this.mailSignIn(e)} />
            <input type="button" value="register" onClick={e => this.register(e)} />
            <input type="button" value="google" onClick={e => this.googleSignIn(e)} />
            <input type="button" value="facebook" onClick={e => this.facebookSignIn(e)} />
            <a href="#">forgotten password</a>
            <span id="currentUserId"> 
                this.firebase
            </span>
            <input type="button" value="logout" onClick={e => this.logout()} />
        </div>;
    }
}
