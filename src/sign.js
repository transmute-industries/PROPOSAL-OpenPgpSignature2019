const createVerifyData = require("./createVerifyData");
const openpgp = require("openpgp");
const defaultDocumentLoader = require("./defaultDocumentLoader");

const sign = async ({ data, privateKey, proof, options }) => {
  if (!proof.verificationMethod) {
    throw new Error("proof.verificationMethod is required");
  }
  if (!proof.created) {
    proof.created = new Date().toISOString();
  }

  const documentLoader =
    options && options.documentLoader
      ? options.documentLoader
      : defaultDocumentLoader;

  if (!options) {
    options = {
      documentLoader
    };
  }

  const signatureOptions = {
    ...proof,
    ...options,
    documentLoader
  };

  proof.type = "OpenPgpSignature2019";

  const { framed, verifyDataHexString } = await createVerifyData(
    data,
    signatureOptions
  );

  let privateKeyObject = privateKey;
  if (typeof privateKey === "string") {
    privateKeyObject = (await openpgp.key.readArmored(privateKey)).keys[0];
  }

  if (privateKeyObject.keyPacket.isEncrypted) {
    if (!options.passphrase) {
      throw new Error("passphrase is required in signature options.");
    }
    await privateKeyObject.decrypt(options.passphrase);
  }

  const { signature } = await openpgp.sign({
    message: openpgp.message.fromBinary(
      Buffer.from(verifyDataHexString + "\n")
    ), // CleartextMessage or Message object
    privateKeys: [privateKeyObject], // for signing
    detached: true
  });

  return {
    ...framed,
    proof: {
      ...proof,
      signatureValue: signature
    }
  };
};

module.exports = sign;
