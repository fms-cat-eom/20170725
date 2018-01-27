#define HUGE 9E16
#define PI 3.14159265
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

// ------

precision highp float;

uniform float time;
uniform float particlePixels;
uniform float frame;
uniform float frames;
uniform bool init;
uniform float deltaTime;
uniform vec2 resolution;

uniform sampler2D textureReturn;
uniform sampler2D textureRandom;
uniform sampler2D textureOctahedron;

// ------

vec2 vInvert( vec2 _uv ) {
  return vec2( 0.0, 1.0 ) + vec2( 1.0, -1.0 ) * _uv;
}

// ------

mat2 rotate2D( float _t ) {
  return mat2( cos( _t ), sin( _t ), -sin( _t ), cos( _t ) );
}

vec4 random( vec2 _uv ) {
  return texture2D( textureRandom, _uv );
}

#pragma glslify: noise = require( ./noise )

// ------

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 puv = vec2( ( floor( gl_FragCoord.x / particlePixels ) * particlePixels + 0.5 ) / resolution.x, uv.y );
  float mode = mod( gl_FragCoord.x, particlePixels );
  vec2 dpix = vec2( 1.0 ) / resolution;

  vec4 pos = texture2D( textureReturn, puv );
  vec4 vel = texture2D( textureReturn, puv + dpix * V.yx );
  vec4 center = texture2D( textureReturn, puv + dpix * V.yx * 2.0 );
  vec4 impact = texture2D( textureReturn, puv + dpix * V.yx * 3.0 );

  float timing = 0.0;//floor( ( uv.y + uv.x / resolution.y ) * frames );

  if ( timing == frame ) {
    vec2 puv2 = vec2( ( floor( gl_FragCoord.x / particlePixels ) + 0.5 ) / 3.0, uv.y );

    pos = V.xxxy;
    vel = vec4(
      texture2D( textureOctahedron, puv2 ).xyz * 6.0,
      1.0
    );

    center = V.xxxy;
    
    impact = vec4(
      random( vec2( 0.0, uv.y ) ).xyz,
      1.0
    );
  }

  float dt = deltaTime;

  {
    vec3 noi = vec3(
      noise( vec4( pos.xyz * 1.4 + 3.7, 1.0 ) ) + 0.8,
      noise( vec4( pos.xyz * 1.4 + 3.7, 2.0 ) ),
      noise( vec4( pos.xyz * 1.4 + 3.7, 3.0 ) )
    );
    vec3 acc = 120.0 * noi * smoothstep( 0.2, 0.1, abs( pos.x - ( time - 0.3 ) * 10.0 ) );
    vel.xyz += acc * dt;

    vel *= exp( -dt * 10.0 );
  }

  {
    mat2 rot = rotate2D( dt * 50.0 * exp( -time * 14.0 ) );
    pos.zx = rot * pos.zx;
    vel.zx = rot * vel.zx;
  }

  vec3 pos1 = texture2D( textureReturn, mod( puv + V.yx * 1.0 / 3.0, 1.0 ) ).xyz;
  vec3 pos2 = texture2D( textureReturn, mod( puv + V.yx * 2.0 / 3.0, 1.0 ) ).xyz;
  center.xyz = ( pos.xyz + pos1 + pos2 ) / 3.0;

  {
    float timing = floor( frames * 0.50 + center.x * 10.0 );
    if ( frame == timing ) {
      vec3 noi = vec3(
        noise( vec4( center.xyz * 7.4 + 3.7, 1.0 ) ) - 1.0,
        noise( vec4( center.xyz * 7.4 + 3.7, 2.0 ) ),
        noise( vec4( center.xyz * 7.4 + 3.7, 3.0 ) )
      );

      vel.xyz += dt * 6000.0 * pow( impact.x, 2.0 ) * noi;
    }

    if ( timing < frame ) {
      pos.yz = rotate2D( dt * 7.0 * vel.x ) * ( pos.yz - center.yz ) + center.yz;
      pos.zx = rotate2D( dt * 7.0 * vel.y ) * ( pos.zx - center.zx ) + center.zx;
    }
  }

  float endAcc = pow( smoothstep( 0.5, 0.9, time ), 4.0 );
  if ( 0.0 != endAcc ) {
    vec3 noi = vec3(
      noise( vec4( center.xyz * 1.4 + 3.7, 1.0 ) ),
      noise( vec4( center.xyz * 1.4 + 3.7, 2.0 ) ),
      noise( vec4( center.xyz * 1.4 + 3.7, 3.0 ) )
    );

    vel.xyz += ( noi + V.xxy ) * endAcc * 500.0 * dt;
    pos.xyz = mix( center.xyz, pos.xyz, exp( -dt * endAcc * 24.0 ) );
  }

  pos.xyz += vel.xyz * dt;

  gl_FragColor = (
    mode < 1.0 ? pos :
    mode < 2.0 ? vel :
    mode < 3.0 ? center :
    impact
  );
}