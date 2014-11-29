#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <errno.h>

#include "d3des.h"
#include "base64.h"

static const char *progname = "vmware-vncpassword";
static const char *keystr = "RemoteDisplay.vnc.key";

void
usage(int ret)
{
   printf("Usage: %s [password]\n", progname);
   exit(ret);
}

int
main(int argc, char *argv[])
{
   char input[DES_HEXKEY_LEN + 1] = { 0 };
   char *output = NULL;
   size_t outlen = 0;
   unsigned int key[32];

   if (argc != 2 || !strlen(argv[1])) {
      printf("invalid arguments specified!\n", progname);
      usage(EINVAL);
   }

   strncat(input, argv[1], DES_HEXKEY_LEN);

   deskey((unsigned char *) input, EN0);
   cpkey(key);

   outlen = Base64_EncodedLength((char *) key, sizeof key);
   output = malloc(outlen);
   if (!output) {
      printf("%s: failed to allocate output buffer!", progname);
      return ENOMEM;
   }

   Base64_Encode((char *) key, sizeof key, output, outlen, NULL); 

   printf("%s = \"%s\"\n", keystr, output);

   return 0;
}
