function twoDigits(n) {
    return n >= 10 ? n.toString() : "0" + n;
}
var LpcOverlay = (function () {
    function LpcOverlay() {
    }
    LpcOverlay.prototype.start = function () {
        var _this = this;
        var injected = this.injected = document.createElement("div");
        injected.innerHTML =
            '  <div class id="LeiaParentalControlBlocker"></div>'
                + '  <div id="LeiaParentalControlOverlay" class="negative">'
                + '<img alt="Leia parental control icon" id="LeiaParentalControlIcon"'
                + 'src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0'
                + 'QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AwEEhgjr9xVQQAAAgtJREFUWMPtVz+s+VAYPajBUivtbJCwmbWMFjaEDYmVSI'
                + 'y620iQ+LdpbOwSXWxmg8FYOtIg0Sb3TYTf855/z+OXvJPc4X6n7T3f6Xfb7xooiiK6ruNVMAAgeCGMeDGo4wnP8+B5/qkLSpIESZK+FlAoFJ6e9bGAl7'
                + '+C96qB7yDLMkRRhNFoRDgcBsMwv+dAo9EAy7LI5XLIZrNgWRatVut3BMiyjFQq9SmeSCSwWCyeL0AUxbu4/6YILwqIRqNfcpFI5PkCGIZBvV7/FG82m7'
                + 'Db7Yc5IQSapqFUKqFcLkPTNBBCfmYbJpNJBAIBdLvdQ+bHiwOAruuwWq3YbrcAgHw+j+VyCbPZ/HgNKIqC4XCIzWaD9XqNwWAARVFOrqlWq4fFAWC73a'
                + 'JWqz3mwHQ6RSwWw3g8Pst7PB50Oh04HI6H6oDshyAIZI9er0eOue9Gv98nuq4Ti8VyiFksFrLb7ci/EATh5N6zDsxmM4RCoaszCAaDmEwmWC6XB9vT6T'
                + 'QoirpvF7Tb7ZsszGQycDqdkCQJqqpCVVVIkgSDwXBfDVyjfI9KpQKfzwer1YrVanXC0TSN0WgEl8v1+N/wHPx+P+LxOGiaPsuvViu43W7M53PYbLaf/x'
                + 'RzHIdisXiVSzc5wHEcBEG4+GCv1wsAMJlMF4XeJODW5vSRRvavJ3yvpvS4X/+NM8Hf2fAtBHwAXS/qCslA2IUAAAAASUVORK5CYII=">'
                + '    <div id="LeiaParentalControlColumn">'
                + '      <div id="LeiaParentalControlLine1"><span id="LeiaParentalControlLink">Leia Parental Control</span>'
                + '        <div id="LeiaParentalControlButtonRight" class="LeiaParentalControlButton">➡</div>'
                + '        <div id="LeiaParentalControlButtonUp" class="LeiaParentalControlButton">⬆</div>'
                + '        <div id="LeiaParentalControlButtonDown" class="LeiaParentalControlButton">⬇</div>'
                + '        <div id="LeiaParentalControlButtonLeft" class="LeiaParentalControlButton">⬅</div>'
                + '      </div>'
                + '      <div id="LeiaParentalControlLine2">'
                + '        <div id="LeiaParentalControlGraph">'
                + '          <div id="LeiaParentalControlProgressBar"></div>'
                + '        </div>'
                + '        <span id="LeiaParentalControlTimeLeft">01:02:03</span>'
                + '      </div>'
                + '    </div>'
                + '  </div>';
        document.body.appendChild(injected);
        document.addEventListener("DOMNodeRemovedFromDocument", function (e) {
            if (e.srcElement == injected) {
                setTimeout(function () {
                    console.log("Injected components were removed...");
                    document.body.appendChild(injected);
                });
            }
        });
        var overlay = document.getElementById('LeiaParentalControlOverlay');
        this.blocker = document.getElementById("LeiaParentalControlBlocker");
        this.progressBarElement = document.getElementById("LeiaParentalControlProgressBar");
        this.timeLeftElement = document.getElementById("LeiaParentalControlTimeLeft");
        document.getElementById('LeiaParentalControlLink').addEventListener("click", function () {
            _this.blocker.classList.toggle("LeiaParentalControlFullscreen");
        });
        document.getElementById('LeiaParentalControlButtonRight').addEventListener("click", function () {
            overlay.classList.toggle("LeiaParentalControlRight");
        });
        document.getElementById('LeiaParentalControlButtonLeft').addEventListener("click", function () {
            overlay.classList.toggle("LeiaParentalControlRight");
        });
        document.getElementById('LeiaParentalControlButtonUp').addEventListener("click", function () {
            overlay.classList.toggle("LeiaParentalControlTop");
        });
        document.getElementById('LeiaParentalControlButtonDown').addEventListener("click", function () {
            overlay.classList.toggle("LeiaParentalControlTop");
        });
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            _this.processMessage(request);
        });
        chrome.runtime.sendMessage({ sender: "LPCOverlay", message: "HELLO", url: document.URL }, function (response) {
            _this.processMessage(response);
        });
    };
    LpcOverlay.prototype.setFullScreen = function (value) {
        if (value) {
            this.blocker.classList.add("LeiaParentalControlFullscreen");
            var videos = document.getElementsByTagName('video');
            if (videos.length && !(videos[0].paused)) {
                this.pausedVideo = videos[0];
                this.pausedVideo.pause();
            }
        }
        else {
            this.blocker.classList.remove("LeiaParentalControlFullscreen");
            if (this.pausedVideo) {
                this.pausedVideo.play();
                this.pausedVideo = null;
            }
        }
    };
    LpcOverlay.prototype.formatTime = function (ms) {
        if (!ms)
            return "";
        var totalSeconds = Math.round(Math.abs(ms / 1000));
        var hours = Math.floor(totalSeconds / 3600);
        var minutes = Math.floor(totalSeconds / 60) % 60;
        var seconds = totalSeconds % 60;
        var text = twoDigits(minutes) + ":" + twoDigits(seconds);
        if (hours > 0 && hours < 48) {
            text = hours + ":" + text;
        }
        return text;
    };
    LpcOverlay.prototype.processMessage = function (message) {
        console.log("ReceivedMessage", message);
        if (message.sender != "LPCBackground")
            return;
        var overlay = document.getElementById("LeiaParentalControlOverlay");
        if (overlay) {
            if (message.message) {
            }
            switch (message.access) {
                case 1 /* AllowedAndFree */:
                    this.setFullScreen(false);
                    break;
                case 2 /* AllowedButTimed */:
                    //this.setFullScreen(message.timeLeft <= 0);
                    break;
                case 3 /* Forbidden */:
                default:
                    this.setFullScreen(true);
                    break;
            }
            var todaysLeft = message.todaysMax - message.todaysTotal;
            var sitesLeft = message.sitesMax - message.sitesTotal;
            if (todaysLeft < sitesLeft) {
                var percent = message.todaysTotal / message.todaysMax;
            }
            else {
                var percent = message.sitesTotal / message.sitesMax;
            }
            this.progressBarElement.style.cssText = 'width:' + (percent * 100) + '% !important';
            this.progressBarElement.classList.toggle("orange", percent > 0.9 && percent <= 1);
            this.progressBarElement.classList.toggle("red", percent > 1);
            var timeLeft = LpcOverlay.friendlyTime(Math.min(todaysLeft, sitesLeft));
            this.timeLeftElement.innerText = timeLeft.toString();
        }
    };
    LpcOverlay.twoDec = function (n) {
        return (n < 10 ? "0" : "") + n;
    };
    LpcOverlay.friendlyTime = function (seconds) {
        if (seconds < 0)
            seconds = -seconds;
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor(seconds / 60) % 60;
        var seconds = Math.floor(seconds % 60);
        return this.twoDec(hours) + ":" + this.twoDec(minutes) + ":" + this.twoDec(seconds);
    };
    return LpcOverlay;
}());
document.addEventListener("DOMContentLoaded", function (event) {
    setTimeout(function () {
        var overlay = new LpcOverlay();
        overlay.start();
    });
});
