var stream = require('stream'),
    util   = require('util'),
    http   = require('http'),
    url    = require('url'),
    fs     = require('fs'),
    exec   = require('child_process').exec,
    speech = new (require('./'))({
      host: '127.0.0.1',
      port: 7000
    });

// turn source buffer intro a readable stream
function BufferStream( source ) {
 
  if ( ! Buffer.isBuffer( source ) ) {
    throw( new Error( "Source must be a buffer." ) );
  }
 
  stream.Readable.call( this );
  this._source = source;
 
  this._offset = 0;
  this._length = source.length;
 
  this.on( "end", this._destroy );

 }
 
util.inherits( BufferStream, stream.Readable );
 
// attemp to avoid memory leaks (not sure if this will do)
BufferStream.prototype._destroy = function() {
  this._source = null;
  this._offset = null;
  this._length = null;
};

// read chunks from source buffer to underlying stream buffer
BufferStream.prototype._read = function( size ) {
 
  // push next chunk onto the internal buffer
  if ( this._offset < this._length ) {
    this.push( this._source.slice( this._offset, ( this._offset + size ) ) );
    this._offset += size;
  }
 
  // close readable stream when consumed
  if ( this._offset >= this._length ) {
    this.push( null );
  }
 
};

// bind HTTP server to port 9000 to directly receive wav file
// e.g. http://127.0.0.1:9000/?speaker=JAMES&text=Text%20to%20be%20spoken
var server = http.createServer(

  function handleHttpRequest( request, response ) {

    var params = url.parse(request.url, true).query;

    speech.requestBuffer({
      text: params.text,
      speakerId: params.speaker,
      voiceFormat: 'WAV',
      all: true
    }, function (err, result) {
      if (err) { return console.error(err); }

      console.log('GET for ' + request.connection.remoteAddress + ' at ' + (new Date()).toString());
      console.log(params);

      response.writeHead(
        200,
        "OK",
        {
          "Content-Type": "audio/x-wav",
          "Contente-Length": result.buffer.length
        }
      );

      // pipe buffer to HTTP body, it will be closed automatically when finished
      new BufferStream(result.buffer).pipe(response);
    });
 
  }
);

server.listen( 9000 );