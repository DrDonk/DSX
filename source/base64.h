/*
 * base64.h --
 *
 *      Functions to base64 encode/decode buffers.
 */

#ifndef _BASE64_H
#define _BASE64_H

#include <stdbool.h>

bool Base64_Encode(char const *src, size_t srcLength,
                   char *target, size_t targSize,
                   size_t *dataLength);
size_t Base64_EncodedLength(char const *src, size_t srcLength);

#endif
