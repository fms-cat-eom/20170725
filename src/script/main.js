import xorshift from './xorshift';
xorshift( 45347586789 );
import GLCat from './glcat';
import step from './step';
import Tweak from './tweak';
import octahedron from './octahedron';
import Automaton from './automaton.min';

const glslify = require( 'glslify' );

// ------

const clamp = ( _value, _min, _max ) => Math.min( Math.max( _value, _min ), _max );
const saturate = ( _value ) => clamp( _value, 0.0, 1.0 );

// ------

let automaton = new Automaton( {
  gui: divAutomaton,
  data: ``
} );
let auto = automaton.auto;

// ------

let width = canvas.width = 320;
let height = canvas.height = 320;

let gl = canvas.getContext( 'webgl' );
let glCat = new GLCat( gl );
gl.disable( gl.DEPTH_TEST );

// ------

let tweak = new Tweak( divTweak );

// ------

let totalFrame = 0;
let frame = 0;
let frames = 200;
let blur = 0;
let blurs = 1;
let time = 0.0;
let init = true;
let secs = 1.0;
let shutterRate = 0.5;
let deltaTime = 0.0;

let timeUpdate = () => {
  let reset = false;

  blur ++;
  if ( blurs <= blur ) {
    blur = 0;
    totalFrame ++;
    frame ++;
    if ( frames <= frame ) {
      frame = 0;
      reset = true;
    }
  }
  
  let prevTime = time;
  time = secs * ( frame + blur / blurs * shutterRate ) / frames;
  deltaTime = ( time + ( reset ? secs : 0.0 ) ) - prevTime;

  init = false;
};

// ------

let oct = octahedron( 18 );
console.log( oct.pos.length )

// ------

let particlePixels = 4;

let vboQuad = glCat.createVertexbuffer( [ -1, -1, 1, -1, -1, 1, 1, 1 ] );
let vboParticle = glCat.createVertexbuffer( ( () => {
  let ret = [];
  for ( let i = 0; i < oct.pos.length / 3; i ++ ) {
    let ix = i % 3;
    let iy = Math.floor( i / 3 );

    ret.push( ix * particlePixels );
    ret.push( iy );
  }
  return ret;
} )() );

// ------

let vertQuad = glslify( './shader/quad.vert' );

let programReturn = glCat.createProgram(
  vertQuad,
  glslify( './shader/return.frag' )
);

let programPcompute = glCat.createProgram(
  vertQuad,
  glslify( './shader/pcompute.frag' )
);

let programPrender = glCat.createProgram(
  glslify( './shader/prender.vert' ),
  glslify( './shader/prender.frag' )
);

let programBlur = glCat.createProgram(
  vertQuad,
  glslify( './shader/blur.frag' )
);

let programBloom = glCat.createProgram(
  vertQuad,
  glslify( './shader/bloom.frag' )
);

let programPost = glCat.createProgram(
  vertQuad,
  glslify( './shader/post.frag' )
);

// ------

let framebufferReturn = glCat.createFloatFramebuffer( width, height );
let framebufferPcomputeReturn = glCat.createFloatFramebuffer( 3 * particlePixels, oct.pos.length / 9 );
let framebufferPcompute = glCat.createFloatFramebuffer( 3 * particlePixels, oct.pos.length / 9 );
let framebufferPrender = glCat.createFloatFramebuffer( width, height );
let framebufferBlur = glCat.createFloatFramebuffer( width, height );
let framebufferBloom = glCat.createFloatFramebuffer( width, height );
let framebufferBloomTemp = glCat.createFloatFramebuffer( width, height );

// ------

let textureRandomSize = 256;

let textureRandomUpdate = ( _tex ) => {
  glCat.setTextureFromArray( _tex, textureRandomSize, textureRandomSize, ( () => {
    let len = textureRandomSize * textureRandomSize * 4;
    let ret = new Uint8Array( len );
    for ( let i = 0; i < len; i ++ ) {
      ret[ i ] = Math.floor( xorshift() * 256.0 );
    }
    return ret;
  } )() );
};

let textureRandom = glCat.createTexture();
glCat.textureWrap( textureRandom, gl.REPEAT );
textureRandomUpdate( textureRandom );

let textureOctahedron = glCat.createTexture();
{
  glCat.setTextureFromFloatArray( textureOctahedron, 3, oct.pos.length / 9, ( () => {
    let ret = new Float32Array( oct.pos.length / 3 * 4 );
    for ( let i = 0; i < oct.pos.length / 3; i ++ ) {
      ret[ i * 4 + 0 ] = oct.pos[ i * 3 + 0 ];
      ret[ i * 4 + 1 ] = oct.pos[ i * 3 + 1 ];
      ret[ i * 4 + 2 ] = oct.pos[ i * 3 + 2 ];
      ret[ i * 4 + 3 ] = 1.0;
    }
    return ret;
  } )() );
}

// ------

let renderA = document.createElement( 'a' );

let saveFrame = () => {
  renderA.href = canvas.toDataURL();
  renderA.download = ( '0000' + totalFrame ).slice( -5 ) + '.png';
  renderA.click();
};

// ------

let cameraPos = [ 0.0, 0.0, 0.0 ];
let lightPos = [ 0.0, 0.0, 0.0 ];
let bfaa = 0.0;

let render = () => {
  gl.viewport( 0, 0, 3 * particlePixels, oct.pos.length / 9 );
  glCat.useProgram( programReturn );
  gl.bindFramebuffer( gl.FRAMEBUFFER, framebufferPcomputeReturn.framebuffer );
  gl.blendFunc( gl.ONE, gl.ONE );
  glCat.clear( 0.0, 0.0, 0.0, 0.0 );

  glCat.attribute( 'p', vboQuad, 2 );

  glCat.uniform2fv( 'resolution', [ 3 * particlePixels, oct.pos.length / 9 ] );

  glCat.uniformTexture( 'texture', framebufferPcompute.texture, 0 );

  gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

  // ------

  gl.viewport( 0, 0, 3 * particlePixels, oct.pos.length / 9 );
  glCat.useProgram( programPcompute );
  gl.bindFramebuffer( gl.FRAMEBUFFER, framebufferPcompute.framebuffer );
  gl.blendFunc( gl.ONE, gl.ONE );
  glCat.clear( 0.0, 0.0, 0.0, 0.0 );

  glCat.attribute( 'p', vboQuad, 2 );

  glCat.uniform1f( 'time', time );
  glCat.uniform1f( 'particlePixels', particlePixels );
  glCat.uniform1f( 'frame', frame % frames );
  glCat.uniform1f( 'frames', frames );
  glCat.uniform1i( 'init', init );
  glCat.uniform1f( 'deltaTime', deltaTime );
  glCat.uniform2fv( 'resolution', [ 3 * particlePixels, oct.pos.length / 9 ] );

  glCat.uniformTexture( 'textureReturn', framebufferPcomputeReturn.texture, 0 );
  glCat.uniformTexture( 'textureRandom', textureRandom, 1 );
  glCat.uniformTexture( 'textureOctahedron', textureOctahedron, 2 );

  gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

  // ------

  gl.viewport( 0, 0, width, height );
  glCat.useProgram( programPrender );
  gl.bindFramebuffer( gl.FRAMEBUFFER, framebufferPrender.framebuffer );
  gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
  glCat.clear( 0.0, 0.0, 0.0, 1.0 );

  glCat.attribute( 'vuv', vboParticle, 2 );

  glCat.uniform1i( 'depth', false );
  glCat.uniform1f( 'time', time );
  glCat.uniform2fv( 'bfaa', [ ( xorshift() - 0.5 ) * bfaa, ( xorshift() - 0.5 ) * bfaa ] );
  glCat.uniform2fv( 'resolution', [ width, height ] );
  glCat.uniform2fv( 'resolutionPcompute', [ 3 * particlePixels, oct.pos.length / 9 ] );
  glCat.uniform3fv( 'cameraPos', cameraPos );
  glCat.uniform3fv( 'lightPos', lightPos );

  glCat.uniformTexture( 'texturePcompute', framebufferPcompute.texture, 0 );

  glCat.uniform1i( 'mode', 0 );
  gl.drawArrays( gl.POINTS, 0, oct.pos.length / 3 );

  glCat.uniform1i( 'mode', 1 );
  gl.drawArrays( gl.LINE_STRIP, 0, oct.pos.length / 3 );

  glCat.uniform1i( 'mode', 2 );
  gl.drawArrays( gl.TRIANGLES, 0, oct.pos.length / 3 );

  // ------

  gl.viewport( 0, 0, width, height );
  glCat.useProgram( programBlur );
  gl.bindFramebuffer( gl.FRAMEBUFFER, framebufferBlur.framebuffer );
  gl.blendFunc( gl.ONE, gl.ONE );
  if ( blur === 0 ) { glCat.clear( 0.0, 0.0, 0.0, 1.0 ); }

  glCat.attribute( 'p', vboQuad, 2 );

  glCat.uniform1f( 'blurs', blurs );
  glCat.uniform2fv( 'resolution', [ width, height ] );

  glCat.uniformTexture( 'texture', framebufferPrender.texture, 0 );

  gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
};

let post = () => {
  for ( let i = 0; i < 4; i ++ ) {
    let gaussVar = 5.0 + i * 5.0;

    // ------

    gl.viewport( 0, 0, width, height );
    glCat.useProgram( programBloom );
    gl.bindFramebuffer( gl.FRAMEBUFFER, framebufferBloomTemp.framebuffer );
    gl.blendFunc( gl.ONE, gl.ONE );
    glCat.clear( 0.0, 0.0, 0.0, 1.0 );

    glCat.attribute( 'p', vboQuad, 2 );

    glCat.uniform1i( 'isVert', false );
    glCat.uniform1f( 'gaussVar', gaussVar );
    glCat.uniform2fv( 'resolution', [ width, height ] );

    glCat.uniformTexture( 'texture', framebufferBlur.texture, 0 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

    // ------

    gl.viewport( 0, 0, width, height );
    glCat.useProgram( programBloom );
    gl.bindFramebuffer( gl.FRAMEBUFFER, framebufferBloom.framebuffer );
    gl.blendFunc( gl.ONE, gl.ONE );
    if ( i === 0 ) { glCat.clear( 0.0, 0.0, 0.0, 1.0 ); }

    glCat.attribute( 'p', vboQuad, 2 );

    glCat.uniform1i( 'isVert', true );
    glCat.uniform1f( 'gaussVar', gaussVar );
    glCat.uniform2fv( 'resolution', [ width, height ] );

    glCat.uniformTexture( 'texture', framebufferBloomTemp.texture, 0 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
  }

  gl.viewport( 0, 0, width, height );
  glCat.useProgram( programPost );
  gl.bindFramebuffer( gl.FRAMEBUFFER, null );
  gl.blendFunc( gl.ONE, gl.ONE );
  glCat.clear( 0.0, 0.0, 0.0, 1.0 );

  glCat.attribute( 'p', vboQuad, 2 );

  glCat.uniform1f( 'time', time );
  glCat.uniform2fv( 'resolution', [ width, height ] );

  glCat.uniformTexture( 'textureBloom', framebufferBloom.texture, 0 );
  glCat.uniformTexture( 'textureBlur', framebufferBlur.texture, 1 );

  gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
}

// ------

let update = () => {
  if ( !tweak.checkbox( 'play', { value: true } ) ) {
    setTimeout( update, 10 );
    return;
  }

  cameraPos = [ 0.0, 0.0, 2.0 ];
  lightPos = [ 3.0, 1.0, 2.0 ];

  blurs = tweak.range( 'blur', { value: 1, min: 1, max: 100, step: 1 } );
  bfaa = tweak.range( 'bfaa', { value: 0.0, min: 0.0, max: 0.1 } );
  shutterRate = tweak.range( 'shutterRate', { value: 0.5, min: 0.0, max: 1.0 } );

  automaton.update( time );
  render();

  console.log( totalFrame );

  timeUpdate();

  if ( blur === 0 ) {
    post();
    if ( tweak.checkbox( 'save', { value: false } ) ) {
      saveFrame();
    }
  }
  
  requestAnimationFrame( update );
};

// ------

step( {
  0: ( done ) => {
    update();
  }
} );

window.addEventListener( 'keydown', ( _e ) => {
  if ( _e.which === 27 ) {
    tweak.checkbox( 'play', { set: false } );
  }
} );
