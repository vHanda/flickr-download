var Flickr = require("flickrapi"),
    flickrOptions = {
      api_key: "14f61ff33b5bd0385faa8445e9ad22f7",
      secret: "3e680067f5544bd5"
    };

var https = require('https');
var fs = require('fs');
var ex = require('exiv2');
var flickr;

function downloadUrl(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = https.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb);
        });
    });
}

function convertToDecimal(val) {
    var regExp = new RegExp("(\\d+) deg ([0-9.]+)' ([0-9.]+)\"")
    var data = regExp.exec(val);
    if (!data) {
        console.log("NO MATCH " + val)
        return 0;
    }

    var deg = parseFloat(data[1]);
    var min = parseFloat(data[2]);
    var sec = parseFloat(data[3]);

    return deg + "/1 " + min + "/1 " + Math.floor(sec) + "/1";
}

function fetchPhoto(photo) {
    var filepath = "img" + photo.id + ".jpg"
    if (fs.existsSync(filepath)) {
        return;
    }

    flickr.photos.getSizes({photo_id: photo.id}, function(err, result) {
        if (err) {
            return;
        }

        var sizes = result.sizes.size
        for (var j = 0; j < sizes.length; j++) {
            var size = sizes[j];
            if (size.width > 1000) {
                console.log(size.source);

                downloadUrl(size.source, filepath, function() {
                    //console.log("Saved " + photo.id + " " + size.source);

                    flickr.photos.getExif({photo_id: photo.id}, function(err, response) {
                        if (err) {
                            return; 
                        }
                        var exif = response.photo.exif
                        var tagMap = {}
                        for (var i = 0; i < exif.length; i++) {
                            var exifTag = exif[i];
                            if (exifTag.tagspace == "GPS")
                                exifTag.tagspace = "GPSInfo";
                            else if (exifTag.tagspace == "ExifIFD")
                                exifTag.tagspace = "Photo"
                            var tag = "Exif." + exifTag.tagspace + '.' + exifTag.tag;
                            var val = exifTag.raw._content

                            if (!exifTag.tagspace.contains("GPS") && !tag.contains("DateTime"))
                                continue;

                            //
                            // Custom processing
                            //
                            if (tag == "Exif.GPSInfo.GPSLatitudeRef") {
                                if (val == "North")
                                    val = "N"
                                else if (val == "South")
                                    val = "S"
                                else
                                    continue;
                            }
                            else if (tag == "Exif.GPSInfo.GPSLongitudeRef") {
                                if (val == "East")
                                    val = "E"
                                else if (val == "West")
                                    val = "W"
                                else
                                    continue;
                            }
                            else if (tag == "Exif.GPSInfo.GPSAltitudeRef") {
                                if (val == "Above Sea Level")
                                    val = "0"
                                else
                                    val = "1"
                            }
                            else if (tag == "Exif.GPSInfo.GPSLatitude") {
                                val = convertToDecimal(val);
                                if (!val) {
                                    continue;
                                }
                            }
                            else if (tag == "Exif.GPSInfo.GPSLongitude") {
                                val = convertToDecimal(val);
                                if (!val) {
                                    continue;
                                }
                            }
                            else if (tag == "Exif.GPSInfo.GPSAltitude") {
                                var regExp = new RegExp("(\\d+) m");
                                var data = regExp.exec(val);
                                if (!data) {
                                    console.log("NO MATCH " + val)
                                    continue;
                                }

                                val = parseFloat(data[1]);
                            }
                            else if (tag == "Exif.Photo.DateTimeOriginal") {

                            }
                            else {
                                continue;
                            }
                            tagMap[tag] = val
                        }

                        if (exif.length == 0) {
                            console.log("NO IMAGE TAGS " + filepath);
                            if (fs.existsSync(filepath))
                                fs.unlinkSync(filepath)
                            return;
                        }

                        console.log(tagMap);
                        ex.setImageTags(filepath, tagMap, function(err) {
                            if (err) {
                                console.log("IMAGE TAG SAVE: " + err);
                                console.log("path " + filepath);
                                console.log(tagMap)
                                if (fs.existsSync(filepath))
                                    fs.unlinkSync(filepath)
                            }
                            else {
                                console.log(filepath)
                            }
                        });
                    });
                });

                return;
            }
        }
    });
}

Flickr.tokenOnly(flickrOptions, function(error, flickrApi) {
    flickr = flickrApi

    // We want 10,000 images
    var options = {
        page: 1,
        per_page: 250,
        has_geo: 1,
        accuracy: 11,
        content_type: 1
    };

    for (var pageNum = 1 ; pageNum < 2; pageNum++) {
        options["page"] = pageNum;
        flickr.photos.search(options, function(err, result) {
            var photos = result.photos.photo
            for (var i = 0; i < photos.length; i++) {
                var photo = photos[i];
                fetchPhoto(photo)
            }
        });
    }
});

String.prototype.contains = function(it) { return this.indexOf(it) != -1; };
