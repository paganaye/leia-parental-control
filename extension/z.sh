# this script is generating a zip file with all the files used by the extension at run time.
# The zip file is used for publishing to Google.
# The zip file is not required during the development phase.

rm "../LeiaParentalControl-Extension.zip"
zip "../LeiaParentalControl-Extension.zip" "manifest.json" "app/background.html" "app/options.html" "app/overlay.css"  "app/popup.html" "images/Parent Guardian-96.png" "dist/app/background.js" "dist/app/options.js" "dist/app/overlay.js" "dist/app/popup.js" "libs/firebase-3.6.1.min.js" "libs/jquery-3.1.1.min.js" 
