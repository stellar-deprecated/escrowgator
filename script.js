function submit(){
    document.getElementById('status_place').innerHTML = "loading"; 
    StellarSdk.Network.useTestNetwork();
    var escrowKeyPair=  StellarSdk.Keypair.random();
    var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
    var sourceKeys = StellarSdk.Keypair.fromSecret($('#source_secret_key').val());

    var sourceAcct;
    var fundAcct;
    var destAcct;
    var escrowAcct;
    var unlock_tx;
    var recovery_tx;
    var fund_tx;

    var d = new Date();
    var year = d.getFullYear();
    var month = d.getMonth();
    var day = d.getDate();
    var unlock_date = new Date(year + $('#lockup_length').val() , month, year);
    var recovery_date = new Date(year + $('#lockup_length').val() +1, month, year);

    var unlock_unix = unlock_date.getTime() / 1000;
    var recovery_unix = recovery_date.getTime()/1000;

    if ($('#lockup_length').val()<0){
        throw new Error('Cannot have a negative lockup length please try again');
    }
    server.loadAccount(sourceKeys.publicKey()).catch(StellarSdk.NotFoundError, function(error){
        throw new Error('Destination Account / Public Key Does not Exist');
    })
    .then(function(acct_result){
        sourceAcct = acct_result;
        var txn = new StellarSdk.TransactionBuilder(sourceAcct)
            .addOperation(StellarSdk.Operation.createAccount({
                destination: escrowKeyPair.publicKey(),
                startingBalance:"32"
            }))
            .build();    
        txn.sign(sourceKeys);
        return server.submitTransaction(txn);
    })
    .then(function(result){
        console.log("SUCCESS: Generated escrow Acct");
    })
    .catch(function(error){
        console.log("ERROR in generating escrow acct");
        console.log(error);
        throw new Error(error);
    })
    .then(function(){
        return server.loadAccount(escrowKeyPair.publicKey()).catch(StellarSdk.NotFoundError, function(error){
            throw new Error('Destination Account / Public Key Does not Exist');
        });
    })
    .then(function(account){
        escrowAcct = account;
        console.log(escrowAcct);
        var txn = new StellarSdk.TransactionBuilder(escrowAcct)
            .addOperation(StellarSdk.Operation.setOptions({ //source acct should be escrow acct
                signer: {
                    ed25519PublicKey: $('#dest_public_key').val(),
                    weight: 1
                }
            }))
            .addOperation(StellarSdk.Operation.setOptions({ //source acct should be escrow
                masterWeight: 1, // set master key weight
                lowThreshold: 2,
                medThreshold: 2, // a payment is medium threshold
                highThreshold: 2 // make sure to have enough weight to add up to the high threshold!
            }))
            .build();   
        txn.sign(escrowKeyPair);
        return server.submitTransaction(txn);
    })    
    .then(function(result){
        console.log("SUCCESS added 2 siggys");
        console.log(result);

    })
    .catch(function(error){
        console.log("ERROR adding 2 siggys");
        console.log(error);
        throw new Error(error);
    })        
    .then(function(){
        console.log(unlock_unix);
        console.log(typeof(unlock_unix));
        var unlock = new StellarSdk.TransactionBuilder(escrowAcct, {timebounds: {
            minTime: unlock_unix,
            maxTime: Number.MAX_SAFE_INTEGER
        }})
        .addOperation(StellarSdk.Operation.setOptions({ //done on escrow act
                signer: {
                    ed25519PublicKey: escrowKeyPair.publicKey(),
                    weight: 0
                }
            }))
        .addOperation(StellarSdk.Operation.setOptions({
                masterWeight: 1, // set master key weight
                lowThreshold: 1,
                medThreshold: 1, // a payment is medium threshold
                highThreshold: 1 // make sure to have enough weight to add up to the high threshold!
            }));
        unlock = unlock.build();
        unlock_tx = unlock.toEnvelope().toXDR('base64');

        escrowAcct.sequence = (parseInt(escrowAcct.sequence)-1).toString();
        console.log(recovery_unix);
        console.log(typeof(recovery_unix));
        var recovery = new StellarSdk.TransactionBuilder(escrowAcct, 
            {
                timebounds: {
                    minTime: recovery_unix,
                    maxTime: Number.MAX_SAFE_INTEGER
                }
            }
        )
        .addOperation(StellarSdk.Operation.setOptions({
                signer: {
                    ed25519PublicKey: $('#dest_public_key').val(),
                    weight: 0
                }
            }))
        .addOperation(StellarSdk.Operation.setOptions({
                masterWeight: 1, // set master key weight
                lowThreshold: 1,
                medThreshold: 1, // a payment is medium threshold
                highThreshold: 1 // make sure to have enough weight to add up to the high threshold!
            }))
            .build();
        recovery_tx = recovery.toEnvelope().toXDR('base64');
        return;
    })
    .then(function(){
        console.log("SUCCESS");
    })
    .catch(function(error){
        console.log("ERROR!");
        console.log(error);
        throw new Error(error);
    })                                                                                                                                                                                                                                                                                   
    .then(function(){
        return server.loadAccount('GB6NVEN5HSUBKMYCE5ZOWSK5K23TBWRUQLZY3KNMXUZ3AQ2ESC4MY4AQ').catch(StellarSdk.NotFoundError, function(error){
            throw new Error('Destination Account / Public Key Does not Exist');
        });
    })
    .then(function(acct_result){
        fundAcct = acct_result;
        console.log(fundAcct);
        var fund = new StellarSdk.TransactionBuilder(fundAcct)
        .addOperation(StellarSdk.Operation.payment({
                destination: escrowKeyPair.publicKey(),
                amount: $('#lumen_amount').val(),
                asset: StellarSdk.Asset.native()
        }))
        .build();
        console.log(fund);
        fund_tx = fund.toEnvelope().toXDR('base64');
        console.log(fund_tx);
    })
    .then(function(){
        console.log("SUCCESS");
    })
    .catch(function(error){
        console.log("ERROR!");
        console.log(error);
        throw new Error(error);
    }) 
    .finally(function(){
        document.getElementById('escrow_id').innerHTML = escrowKeyPair.publicKey();
        document.getElementById('escrow_secret').innerHTML = escrowKeyPair.secret();
        document.getElementById('unlock_tx').innerHTML = unlock_tx; 
        document.getElementById('recover_tx').innerHTML = recovery_tx; 
        document.getElementById('fund_tx').innerHTML = fund_tx; 
        document.getElementById('status_place').innerHTML = null; 
    });
}