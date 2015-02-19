var Flickr = require("flickrapi"),
    flickrOptions = {
      api_key: "14f61ff33b5bd0385faa8445e9ad22f7",
      secret: "3e680067f5544bd5"
    };

var https = require('https');
var fs = require('fs');
//var ex = require('exiv2');
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

function fetchPhoto(photo) {
    flickr.photos.getSizes({photo_id: photo.id}, function(err, result) {
        if (err) {
            return;
        }
        
        var sizes = result.sizes.size
        for (var j = 0; j < sizes.length; j++) {
            var size = sizes[j];
            if (size.width > 1000) {
                console.log(size.source);
                
                downloadUrl(size.source, "img" + photo.id, function() {
                    console.log("Saved " + photo.id + " " + size.source);
                    
                    flickr.photos.getExif({photo_id: photo.id}, function(err, response) {
                        if (err) {
                            return; 
                        }
                        var exif = response.photo.exif
                        for (var i = 0; i < exif.length; i++) {
                            var exifTag = exif[i];
                            var tag = exifTag.tagspace + '.' + exifTag.label;
                            var val = exifTag.raw._content
                            
                            console.log(tag + " --> " + val)
                            // How do I save this information into the image??
                        }
                    });
                });
                
                return;
            }
        }
    });
}

Flickr.tokenOnly(flickrOptions, function(error, flickrApi) {
    flickr = flickrApi
    
    flickr.photos.search({page: 1, per_page: 500, has_geo: 1}, function(err, result) {
        var photos = result.photos.photo
        for (var i = 0; i < photos.length; i++) {
            var photo = photos[i];
            fetchPhoto(photo)
        }
    });
});