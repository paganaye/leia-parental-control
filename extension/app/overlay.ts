
class LpcOverlay {
    overlay: HTMLDivElement;
    pausedVideo: HTMLVideoElement | null;

    start() {
        console.log(1);
        var overlay = this.overlay = document.createElement("div");
        overlay.id = "LeiaParentalControlOverlay";
        overlay.innerText = "Leia Parental Control";
        document.body.appendChild(overlay);

        document.addEventListener("DOMNodeRemovedFromDocument", (e) => {
            if (e.srcElement == overlay) {
                setTimeout(() => {
                    console.log("Overlay was removed...");
                    document.body.appendChild(overlay);
                });
            }
        });

        overlay.addEventListener("click", () => {
            this.overlayClicked();
        });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.processMessage(request);
        });

        chrome.runtime.sendMessage({ sender: "LPCOverlay", message: "HELLO", url: document.URL }, (response) => {
            this.processMessage(response);
        });
    }

    setFullScreen(value: boolean) {
        if (value) {
            this.overlay.classList.add('fullscreen');
            var videos = document.getElementsByTagName('video');
            if (videos.length && !(videos[0].paused)) {
                this.pausedVideo = videos[0];
                this.pausedVideo.pause();
            }
        } else {
            this.overlay.classList.remove('fullscreen');
            if (this.pausedVideo) {
                this.pausedVideo.play();
                this.pausedVideo = null;
            }
        }
    }

    overlayClicked() {
        {
            console.log("overlay clicked");
            if (chrome.runtime) {
                var isFullScreen = this.overlay.classList.contains('fullscreen');
                this.setFullScreen(!isFullScreen);
                chrome.runtime.sendMessage("I was clicked", (response) => {
                    console.log("response from extension:", response);
                });
            }
        }
    }

    processMessage(message: any) {
        if (message.sender != "LPCBackground") return;
        var overlay = document.getElementById("LeiaParentalControlOverlay")
        if (overlay) {
            if (message.message) {
                overlay.innerText = message.message;
            }
            if (message.showPage)
                overlay.classList.remove('fullscreen');
            else {
                overlay.classList.add('fullscreen');
            }
        }
    }

}


document.addEventListener("DOMContentLoaded", function(event) {
    setTimeout(() => {
        var overlay = new LpcOverlay();
        overlay.start();
    });
});
